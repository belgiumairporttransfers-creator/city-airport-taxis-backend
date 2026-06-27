import { RedisClient } from "@/infrastructure/redis/client";
import type { ParticipantAccountType } from "@/modules/communication/types/communication.types";

const TYPING_TTL_SECONDS = 5;

const typingKey = (conversationId: string, accountType: ParticipantAccountType, accountId: string) =>
  `comm:typing:${conversationId}:${accountType}:${accountId}`;

const memoryTyping = new Set<string>();

class TypingService {
  async startTyping(conversationId: string, accountType: ParticipantAccountType, accountId: string) {
    const key = typingKey(conversationId, accountType, accountId);
    memoryTyping.add(key);

    const client = await RedisClient.connect();
    if (client) {
      await client.set(key, "1", { EX: TYPING_TTL_SECONDS });
    }
  }

  async stopTyping(conversationId: string, accountType: ParticipantAccountType, accountId: string) {
    const key = typingKey(conversationId, accountType, accountId);
    memoryTyping.delete(key);

    const client = await RedisClient.connect();
    if (client) {
      await client.del(key);
    }
  }

  async isTyping(conversationId: string, accountType: ParticipantAccountType, accountId: string) {
    const key = typingKey(conversationId, accountType, accountId);

    const client = await RedisClient.connect();
    if (client) {
      const value = await client.get(key);
      return Boolean(value);
    }

    return memoryTyping.has(key);
  }
}

export default new TypingService();
