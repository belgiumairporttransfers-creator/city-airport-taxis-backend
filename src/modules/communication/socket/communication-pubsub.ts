import type { RedisClientType } from "redis";
import { RedisClient } from "@/infrastructure/redis/client";
import communicationGateway from "@/modules/communication/socket/communication.gateway";
import type { CommunicationPubSubMessage } from "@/modules/communication/types/communication.types";
import logger from "@/shared/utils/logger";

export const COMMUNICATION_REDIS_CHANNEL = "communication:events";

class CommunicationPubSub {
  private subscriber: RedisClientType | null = null;

  async init(): Promise<void> {
    if (!RedisClient.isEnabled()) {
      logger.info("Communication pub/sub skipped — Redis disabled");
      return;
    }

    const client = await RedisClient.connect();
    if (!client) {
      logger.warn("Communication pub/sub skipped — Redis unavailable");
      return;
    }

    if (this.subscriber?.isOpen) {
      return;
    }

    this.subscriber = client.duplicate();
    await this.subscriber.connect();

    await this.subscriber.subscribe(COMMUNICATION_REDIS_CHANNEL, (message) => {
      try {
        const parsed = JSON.parse(message) as CommunicationPubSubMessage;
        communicationGateway.handleMessage(parsed);
      } catch (error) {
        logger.error("Failed to process communication pub/sub message", { error });
      }
    });

    logger.info("Communication Redis pub/sub subscriber ready");
  }

  async publish(message: CommunicationPubSubMessage): Promise<void> {
    const client = await RedisClient.connect();

    if (!client) {
      communicationGateway.handleMessage(message);
      return;
    }

    await client.publish(COMMUNICATION_REDIS_CHANNEL, JSON.stringify(message));
  }

  async shutdown(): Promise<void> {
    if (!this.subscriber?.isOpen) {
      this.subscriber = null;
      return;
    }

    try {
      await this.subscriber.unsubscribe(COMMUNICATION_REDIS_CHANNEL);
      await this.subscriber.quit();
    } catch (error) {
      logger.error("Error shutting down communication pub/sub", { error });
    } finally {
      this.subscriber = null;
    }
  }
}

export default new CommunicationPubSub();
