const BASE = process.env.BASE || "http://localhost:3000";
const PATH = process.env.SEARCH_PATH || "/api/search?q=";
const HEADERS = process.env.TOKEN ? { Authorization: `Bearer ${process.env.TOKEN}` } : {};

const techs = ["react","docker","postgresql","redis","typescript","kubernetes","graphql","prisma","ffmpeg","node.js"];
const nouns = ["tutorial","guide","basics","project","tips"];
const queries = techs.flatMap(t => nouns.map(n => `${t} ${n}`)); // 50 distinct

const pct = (a, p) => a[Math.min(a.length - 1, Math.floor((p / 100) * a.length))];

async function pass(label) {
  const times = [];
  for (const q of queries) {
    const t0 = performance.now();
    const r = await fetch(BASE + PATH + encodeURIComponent(q), { headers: HEADERS });
    await r.text();
    times.push(performance.now() - t0);
    if (!r.ok && times.length === 1) console.warn("status", r.status, "(check route/auth)");
  }
  times.sort((a, b) => a - b);
  const avg = times.reduce((s, x) => s + x, 0) / times.length;
  console.log(`${label}: n=${times.length} avg=${avg.toFixed(1)}ms p50=${pct(times,50).toFixed(1)}ms p95=${pct(times,95).toFixed(1)}ms max=${times.at(-1).toFixed(1)}ms`);
}

(async () => {
  await fetch(BASE + PATH + "warmup", { headers: HEADERS }).then(r => r.text()); // wake Prisma
  await pass("cold (cache miss)");
  await pass("warm (Redis hit)");
})();