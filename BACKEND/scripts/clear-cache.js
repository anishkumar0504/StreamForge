require("dotenv").config();
const redis = require("../lib/redis");
(async () => {
  let n = 0;
  const stream = redis.scanStream({ match: "search:candidates:*", count: 200 });
  for await (const keys of stream) if (keys.length) n += await redis.del(...keys);
  console.log("deleted", n);
  process.exit(0);
})();   