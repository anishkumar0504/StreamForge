const Redis = require("ioredis");

const publisher = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: 2,
  enableReadyCheck: true,
  lazyConnect: true,
});

publisher.on("error", (err) => {
  console.error("Redis publisher error:", err.message);
});

const publishVideoUpdate = async (userId, videoId, data) => {
  try {
    await publisher.publish(
      "video:updates",
      JSON.stringify({ userId, videoId, ...data })
    );
  } catch (err) {
    console.error("publishVideoUpdate failed:", err.message);
  }
};

const closePublisher = () => publisher.quit();

module.exports = { publishVideoUpdate, closePublisher };