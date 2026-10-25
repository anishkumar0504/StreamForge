const { PrismaClient } = require("@prisma/client");
require("dotenv").config();
const prisma = new PrismaClient();

const COUNT = Number(process.env.SEED_COUNT || 10000);

async function pickEnum(typeName, preferred) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT e.enumlabel AS label FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = $1`,
    typeName
  );
  const labels = rows.map((r) => r.label);
  const hit = preferred.find((p) => labels.includes(p));
  if (!hit) throw new Error(`${typeName} values are [${labels.join(", ")}]; set one in the script`);
  return hit;
}

async function main() {
  const users = await prisma.$queryRawUnsafe(`SELECT id FROM "User" LIMIT 1`);
  if (!users.length) throw new Error("No user found. Register one in the app first.");
  const userId = users[0].id;

  const status = await pickEnum("VideoStatus", ["READY", "COMPLETED", "PUBLISHED", "PROCESSED"]);
  const visibility = await pickEnum("Visibility", ["PUBLIC"]);
  console.log({ userId, status, visibility, COUNT });

  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

  // remove earlier seed rows so reruns stay at exactly COUNT
  await prisma.$executeRawUnsafe(`DELETE FROM "Video" WHERE "originalName" = 'seed-bench'`);

  await prisma.$executeRawUnsafe(
    `
    INSERT INTO "Video"
      (id, title, description, status, visibility, "userId", "originalName",
       "publishedAt", "updatedAt", "searchVector")
    SELECT
      gen_random_uuid()::text, t.title, t.descr,
      $1::"VideoStatus", $2::"Visibility", $3, 'seed-bench',
      now() - (random() * interval '365 days'), now(),
      to_tsvector('english', t.title || ' ' || t.descr)
    FROM (
      SELECT
        (ARRAY['Learn','Build','Deploy','Master','Intro to','Advanced','Quick','Complete'])[1 + floor(random()*8)::int] || ' ' ||
        (ARRAY['React','Node.js','Docker','PostgreSQL','Redis','TypeScript','Kubernetes','GraphQL','Prisma','FFmpeg'])[1 + floor(random()*10)::int] || ' ' ||
        (ARRAY['tutorial','crash course','guide','walkthrough','project','tips','deep dive','basics'])[1 + floor(random()*8)::int] || ' ' || g AS title,
        (ARRAY['A hands on session covering','Step by step demo of','Everything you need to know about','Common mistakes when using'])[1 + floor(random()*4)::int] || ' ' ||
        (ARRAY['streaming','databases','backend APIs','containers','caching','video pipelines','testing','deployment'])[1 + floor(random()*8)::int] AS descr
      FROM generate_series(1, $4::int) AS g
    ) t
    `,
    status, visibility, userId, COUNT
  );

  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS video_search_vector_idx ON "Video" USING GIN ("searchVector")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS video_title_trgm_idx ON "Video" USING GIN (title gin_trgm_ops)`
  );
  await prisma.$executeRawUnsafe(`ANALYZE "Video"`);

  const [{ count }] = await prisma.$queryRawUnsafe(
    `SELECT count(*)::int AS count FROM "Video" WHERE "originalName" = 'seed-bench'`
  );
  console.log("seeded rows:", count);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());