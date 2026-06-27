import { Queue, Worker, type Job } from "bullmq";
import { env } from "@/config/env";
import { RedisClient } from "@/infrastructure/redis/client";
import logger from "@/shared/utils/logger";
import { processNewsletterDelivery } from "@/modules/newsletter/queues/newsletter-delivery.processor";
import newsletterCampaignRepository from "@/modules/newsletter/repositories/newsletter-campaign.repository";

export const NEWSLETTER_DELIVERY_QUEUE_NAME = "newsletter-delivery";

export interface NewsletterDeliveryJobData {
  campaignId: string;
}

let queue: Queue<NewsletterDeliveryJobData> | null = null;
let worker: Worker<NewsletterDeliveryJobData> | null = null;
let queueUnavailable = false;
let lastWorkerErrorLogAt = 0;

const getQueueConnection = () => {
  const useTls = env.REDIS_URL.startsWith("rediss://");

  return {
    url: env.REDIS_URL,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy: () => null,
    ...(useTls ? { tls: {} } : {}),
  };
};

const markQueueUnavailable = async (reason: string, error?: unknown) => {
  if (queueUnavailable) return;

  queueUnavailable = true;

  await worker?.close().catch(() => undefined);
  await queue?.close().catch(() => undefined);
  worker = null;
  queue = null;

  logger.warn("Newsletter delivery queue unavailable — using in-process fallback", {
    reason,
    error: error instanceof Error ? error.message : error,
  });
};

const handleDeliveryFailure = async (campaignId: string, error: unknown) => {
  logger.error("Newsletter campaign delivery failed", { campaignId, error });
  await newsletterCampaignRepository.updateById(campaignId, { status: "failed" });
};

const processDeliveryJob = async (job: Job<NewsletterDeliveryJobData>) => {
  const { campaignId } = job.data;

  await processNewsletterDelivery(campaignId, async (progress) => {
    await job.updateProgress(progress.percent);
  });
};

export const isNewsletterQueueEnabled = () =>
  env.NEWSLETTER_QUEUE_ENABLED && env.REDIS_ENABLED && Boolean(env.REDIS_URL) && !queueUnavailable;

export const startNewsletterDeliveryWorker = async () => {
  if (worker || queueUnavailable || !env.NEWSLETTER_QUEUE_ENABLED || !env.REDIS_ENABLED) {
    if (!env.NEWSLETTER_QUEUE_ENABLED || !env.REDIS_ENABLED) {
      logger.info("Newsletter delivery queue is disabled — using in-process fallback");
    }
    return;
  }

  const redis = await RedisClient.connect();
  if (!redis) {
    await markQueueUnavailable("Redis is not connected");
    return;
  }

  try {
    const connection = getQueueConnection();

    queue = new Queue<NewsletterDeliveryJobData>(NEWSLETTER_DELIVERY_QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });

    await queue.waitUntilReady();

    worker = new Worker<NewsletterDeliveryJobData>(
      NEWSLETTER_DELIVERY_QUEUE_NAME,
      processDeliveryJob,
      {
        connection,
        concurrency: 1,
      }
    );

    await worker.waitUntilReady();
  } catch (error) {
    await markQueueUnavailable("Failed to initialize BullMQ worker", error);
    return;
  }

  worker.on("failed", (job, error) => {
    if (!job?.data?.campaignId) return;
    void handleDeliveryFailure(job.data.campaignId, error);
  });

  worker.on("error", (error) => {
    const now = Date.now();
    if (now - lastWorkerErrorLogAt < 60_000) return;
    lastWorkerErrorLogAt = now;

    logger.error("Newsletter delivery worker error", {
      error: error instanceof Error ? error.message : error,
    });

    void markQueueUnavailable("Worker connection error", error);
  });

  logger.info("Newsletter delivery worker started", {
    queue: NEWSLETTER_DELIVERY_QUEUE_NAME,
    provider: "smtp",
    batchSize: env.NEWSLETTER_BATCH_SIZE,
  });
};

export const stopNewsletterDeliveryWorker = async () => {
  await worker?.close();
  await queue?.close();

  worker = null;
  queue = null;

  logger.info("Newsletter delivery worker stopped");
};

export const enqueueNewsletterDelivery = async (campaignId: string): Promise<boolean> => {
  if (!isNewsletterQueueEnabled()) {
    return false;
  }

  try {
    if (!queue) {
      await startNewsletterDeliveryWorker();
    }

    if (!queue || queueUnavailable) {
      return false;
    }

    await queue.add(
      "deliver-campaign",
      { campaignId },
      {
        jobId: `newsletter-${campaignId}-${Date.now()}`,
      }
    );

    return true;
  } catch (error) {
    await markQueueUnavailable("Failed to enqueue newsletter delivery job", error);
    return false;
  }
};

export const runNewsletterDeliveryFallback = (campaignId: string) => {
  void processNewsletterDelivery(campaignId).catch((error) =>
    handleDeliveryFailure(campaignId, error)
  );
};
