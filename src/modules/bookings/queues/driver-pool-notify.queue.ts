import { Queue, Worker, type Job } from "bullmq";
import { env } from "@/config/env";
import { RedisClient } from "@/infrastructure/redis/client";
import logger from "@/shared/utils/logger";
import settingsService from "@/modules/settings/services/settings.service";
import bookingRepository from "@/modules/bookings/repositories/booking.repository";
import bookingDriverNotificationService from "@/modules/bookings/services/booking-driver-notification.service";

export const DRIVER_POOL_NOTIFY_QUEUE_NAME = "driver-pool-notify";

export interface DriverPoolNotifyJobData {
  bookingId: string;
}

const jobIdForBooking = (bookingId: string) => `driver-pool-notify-${bookingId}`;

let queue: Queue<DriverPoolNotifyJobData> | null = null;
let worker: Worker<DriverPoolNotifyJobData> | null = null;
let queueUnavailable = false;
const fallbackTimers = new Map<string, NodeJS.Timeout>();

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

  logger.warn("Driver pool notify queue unavailable — using in-process delay fallback", {
    reason,
    error: error instanceof Error ? error.message : error,
  });
};

export const processDriverPoolNotify = async (bookingId: string) => {
  const booking = await bookingRepository.findById(bookingId);

  if (!booking) {
    logger.info("Skipping driver pool notify — booking not found", { bookingId });
    return;
  }

  if (booking.driverPoolNotifiedAt) {
    logger.info("Skipping driver pool notify — already notified", {
      bookingNumber: booking.bookingNumber,
    });
    return;
  }

  if (booking.status !== "confirmed") {
    logger.info("Skipping driver pool notify — booking not confirmed", {
      bookingNumber: booking.bookingNumber,
      status: booking.status,
    });
    return;
  }

  if (booking.currentDriverId || booking.driver?.driverId) {
    logger.info("Skipping driver pool notify — driver already assigned", {
      bookingNumber: booking.bookingNumber,
    });
    return;
  }

  await bookingDriverNotificationService.notifyAllDriversOfConfirmedBooking(booking);
  await bookingRepository.updateById(bookingId, { driverPoolNotifiedAt: new Date() });
};

const clearFallbackTimer = (bookingId: string) => {
  const timer = fallbackTimers.get(bookingId);
  if (timer) {
    clearTimeout(timer);
    fallbackTimers.delete(bookingId);
  }
};

const scheduleFallback = (bookingId: string, delayMs: number) => {
  clearFallbackTimer(bookingId);

  const timer = setTimeout(() => {
    fallbackTimers.delete(bookingId);
    void processDriverPoolNotify(bookingId).catch((error) => {
      logger.error("Driver pool notify fallback failed", { bookingId, error });
    });
  }, delayMs);

  fallbackTimers.set(bookingId, timer);
};

export const isDriverPoolNotifyQueueEnabled = () =>
  env.REDIS_ENABLED && Boolean(env.REDIS_URL) && !queueUnavailable;

export const startDriverPoolNotifyWorker = async () => {
  if (worker || queueUnavailable || !env.REDIS_ENABLED) {
    return;
  }

  const redis = await RedisClient.connect();
  if (!redis) {
    await markQueueUnavailable("Redis is not connected");
    return;
  }

  try {
    const connection = getQueueConnection();

    queue = new Queue<DriverPoolNotifyJobData>(DRIVER_POOL_NOTIFY_QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });

    await queue.waitUntilReady();

    worker = new Worker<DriverPoolNotifyJobData>(
      DRIVER_POOL_NOTIFY_QUEUE_NAME,
      async (job: Job<DriverPoolNotifyJobData>) => {
        await processDriverPoolNotify(job.data.bookingId);
      },
      {
        connection,
        concurrency: 2,
      }
    );

    await worker.waitUntilReady();
  } catch (error) {
    await markQueueUnavailable("Failed to initialize driver pool notify worker", error);
    return;
  }

  worker.on("failed", (job, error) => {
    logger.error("Driver pool notify job failed", {
      bookingId: job?.data.bookingId,
      error: error instanceof Error ? error.message : error,
    });
  });

  logger.info("Driver pool notify worker started", {
    queue: DRIVER_POOL_NOTIFY_QUEUE_NAME,
  });
};

export const stopDriverPoolNotifyWorker = async () => {
  for (const [bookingId, timer] of fallbackTimers) {
    clearTimeout(timer);
    fallbackTimers.delete(bookingId);
  }

  await worker?.close();
  await queue?.close();
  worker = null;
  queue = null;
  logger.info("Driver pool notify worker stopped");
};

export const cancelDriverPoolNotify = async (bookingId: string) => {
  clearFallbackTimer(bookingId);

  if (!isDriverPoolNotifyQueueEnabled()) {
    return;
  }

  try {
    if (!queue) {
      await startDriverPoolNotifyWorker();
    }

    if (!queue || queueUnavailable) {
      return;
    }

    const job = await queue.getJob(jobIdForBooking(bookingId));
    if (job) {
      await job.remove();
      logger.info("Cancelled scheduled driver pool notify", { bookingId });
    }
  } catch (error) {
    logger.warn("Failed to cancel driver pool notify job", {
      bookingId,
      error: error instanceof Error ? error.message : error,
    });
  }
};

export const scheduleDriverPoolNotify = async (bookingId: string) => {
  const settings = await settingsService.getSettings();
  const delayMinutes = Math.max(0, Number(settings.driverNotificationDelayMinutes ?? 10));
  const delayMs = delayMinutes * 60_000;

  await cancelDriverPoolNotify(bookingId);

  if (!isDriverPoolNotifyQueueEnabled()) {
    scheduleFallback(bookingId, delayMs);
    logger.info("Scheduled driver pool notify via fallback", {
      bookingId,
      delayMinutes,
    });
    return;
  }

  try {
    if (!queue) {
      await startDriverPoolNotifyWorker();
    }

    if (!queue || queueUnavailable) {
      scheduleFallback(bookingId, delayMs);
      return;
    }

    await queue.add(
      "notify-drivers",
      { bookingId },
      {
        jobId: jobIdForBooking(bookingId),
        delay: delayMs,
      }
    );

    logger.info("Scheduled driver pool notify", { bookingId, delayMinutes });
  } catch (error) {
    await markQueueUnavailable("Failed to enqueue driver pool notify", error);
    scheduleFallback(bookingId, delayMs);
  }
};
