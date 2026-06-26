import type { RedisClientType } from "redis";
import { RedisClient } from "@/infrastructure/redis/client";
import notificationGateway from "@/modules/notifications/socket/notification.gateway";
import type { NotificationPubSubMessage } from "@/modules/notifications/types/notification.types";
import logger from "@/shared/utils/logger";

const NOTIFICATION_REDIS_CHANNEL = "notifications:events";

class NotificationPubSub {
  private subscriber: RedisClientType | null = null;

  async init(): Promise<void> {
    if (!RedisClient.isEnabled()) {
      logger.info("Notification pub/sub skipped — Redis disabled");
      return;
    }

    const client = await RedisClient.connect();
    if (!client) {
      logger.warn("Notification pub/sub skipped — Redis unavailable");
      return;
    }

    if (this.subscriber?.isOpen) {
      return;
    }

    this.subscriber = client.duplicate();
    await this.subscriber.connect();

    await this.subscriber.subscribe(NOTIFICATION_REDIS_CHANNEL, (message) => {
      try {
        const parsed = JSON.parse(message) as NotificationPubSubMessage;
        notificationGateway.handleMessage(parsed);
      } catch (error) {
        logger.error("Failed to process notification pub/sub message", { error });
      }
    });

    logger.info("Notification Redis pub/sub subscriber ready");
  }

  async publish(message: NotificationPubSubMessage): Promise<void> {
    const client = await RedisClient.connect();

    if (!client) {
      notificationGateway.handleMessage(message);
      return;
    }

    await client.publish(NOTIFICATION_REDIS_CHANNEL, JSON.stringify(message));
  }

  async shutdown(): Promise<void> {
    if (!this.subscriber?.isOpen) {
      this.subscriber = null;
      return;
    }

    try {
      await this.subscriber.unsubscribe(NOTIFICATION_REDIS_CHANNEL);
      await this.subscriber.quit();
    } catch (error) {
      logger.error("Error shutting down notification pub/sub", { error });
    } finally {
      this.subscriber = null;
    }
  }
}

export default new NotificationPubSub();
