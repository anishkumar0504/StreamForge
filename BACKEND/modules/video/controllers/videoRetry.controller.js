const { PrismaClient } = require("@prisma/client");
const { videoQueue } = require("../../../queues/videoQueue");

const prisma = new PrismaClient();

const MAX_RETRIES = 3;

const retryProcessing = async (req, res) => {
  try {
    const videoId = req.params.id;
    const userId = req.user.id;

    const video = await prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    if (video.userId !== userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (video.status !== "PROCESSING_FAILED") {
      return res.status(400).json({
        message: "Video is not retryable",
        status: video.status,
      });
    }

    if (video.processingAttempts >= MAX_RETRIES) {
      return res.status(409).json({
        message: "Retry limit exceeded",
        attempts: video.processingAttempts,
        maxRetries: MAX_RETRIES,
      });
    }

    // Atomic reset: only one concurrent request can win
    const updated = await prisma.video.updateMany({
      where: { id: videoId, status: "PROCESSING_FAILED" },
      data: { status: "PROCESSING", errorMessage: null, processingStage: null },
    });

    if (updated.count === 0) {
      return res.status(409).json({ message: "Already retrying" });
    }

    // Re-enqueue; roll back status if enqueue fails
    try {
      await videoQueue.add("process-video", {
        videoId: video.id,
        userId: video.userId,
        s3Key: video.originalFileUrl,
      });
    } catch (queueError) {
      console.error("Enqueue failed:", queueError);
      await prisma.video.update({
        where: { id: videoId },
        data: { status: "PROCESSING_FAILED", errorMessage: "Could not queue job" },
      });
      return res.status(503).json({ message: "Queue unavailable, try again" });
    }

    return res.json({ message: "Processing retry started", videoId });
  } catch (error) {
    console.error("Retry processing failed:", error);
    return res.status(500).json({ message: "Retry processing failed" });
  }
};

module.exports = { retryProcessing };