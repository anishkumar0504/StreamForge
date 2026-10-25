const prisma = require("../../../lib/prisma");
const redis = require("../../../lib/redis");

const MAX_VIDEO_CANDIDATES = 8000;
const MAX_CHANNEL_CANDIDATES = 3000;
const CACHE_TTL = 60;

module.exports = {
  async generateCandidates(parsedQuery, type) {
    const { normalizedQuery, significantTokens } = parsedQuery;

    const cacheKey = `search:candidates:v4:${type}:${normalizedQuery}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const videoMap = new Map();
    const channelSet = new Set();

    /* ---------------- Video candidates (parallel) ---------------- */
    if (type !== "channel") {
      const tokenQuery = significantTokens.join(" | ");
      const [fts, prefix, fuzzy, token] = await Promise.all([
        prisma.$queryRaw`
          SELECT id, views, "createdAt", "userId" FROM "Video"
          WHERE status = 'READY' AND visibility = 'PUBLIC'
            AND "searchVector" @@ plainto_tsquery('english', ${normalizedQuery})
          LIMIT 5000`,
        prisma.video.findMany({
          where: {
            title: { startsWith: significantTokens[0] || "", mode: "insensitive" },
            status: "READY",
            visibility: "PUBLIC"
          },
          select: { id: true, views: true, createdAt: true, userId: true },
          take: 2000
        }),
        prisma.$queryRaw`
          SELECT id, views, "createdAt", "userId" FROM "Video"
          WHERE title % ${normalizedQuery}
            AND status = 'READY' AND visibility = 'PUBLIC'
          ORDER BY title <-> ${normalizedQuery}
          LIMIT 2000`,
        significantTokens.length > 1
          ? prisma.$queryRaw`
              SELECT id, views, "createdAt", "userId" FROM "Video"
              WHERE "searchVector" @@ to_tsquery('english', ${tokenQuery})
                AND status = 'READY' AND visibility = 'PUBLIC'
              LIMIT 2000`
          : Promise.resolve([])
      ]);
      for (const rows of [fts, prefix, fuzzy, token]) {
        for (const v of rows) if (!videoMap.has(v.id)) videoMap.set(v.id, v);
      }
    }

    /* ---------------- Channel candidates (unchanged) ---------------- */
    if (type !== "video") {
      const channels = await prisma.$queryRaw`
        SELECT id FROM "User"
        WHERE "searchVector" @@ plainto_tsquery('english', ${normalizedQuery})
        LIMIT 2000;
      `;
      channels.forEach(c => channelSet.add(c.id));

      if (channelSet.size < MAX_CHANNEL_CANDIDATES) {
        const prefixChannels = await prisma.user.findMany({
          where: {
            username: { startsWith: significantTokens[0] || "", mode: "insensitive" }
          },
          select: { id: true },
          take: 1000
        });
        prefixChannels.forEach(c => channelSet.add(c.id));
      }

      if (channelSet.size < MAX_CHANNEL_CANDIDATES) {
        const fuzzyChannels = await prisma.$queryRaw`
          SELECT id FROM "User"
          WHERE similarity(username, ${normalizedQuery}) > 0.3
          ORDER BY similarity(username, ${normalizedQuery}) DESC
          LIMIT 1000;
        `;
        fuzzyChannels.forEach(c => channelSet.add(c.id));
      }
    }

    /* ---------------- Finalize ---------------- */
    const result = {
      videoCandidates: Array.from(videoMap.values()),
      channelCandidates: Array.from(channelSet)
    };

    await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_TTL);
    return result;
  }
};
