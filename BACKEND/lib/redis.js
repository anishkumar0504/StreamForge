const Redis = require("ioredis");

const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL)
  : new Redis({
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT) || 6379,
      ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD }),
      ...(process.env.REDIS_TLS === "true" && { tls: {} }),
    });

redis.on("error", (err) => console.error("Redis error:", err.message));

module.exports = redis;
// const redis = new Redis({
//   host: process.env.REDIS_HOST,
//   port: Number(process.env.REDIS_PORT),
// });
// redis.on("connect", () => {
//   console.log("Redis connected");
// });

// module.exports = redis;