import { RedisClient } from "@/infrastructure/redis/client";
import { onlineUsersRegistry } from "@/infrastructure/socket/registry/online-users.registry";
import type {
  ParticipantAccountType,
  PresenceStatus,
} from "@/modules/communication/types/communication.types";

const presenceKey = (accountType: ParticipantAccountType, accountId: string) =>
  `comm:presence:${accountType}:${accountId}`;

const memoryPresence = new Map<string, { status: PresenceStatus; lastSeenAt: string }>();

class PresenceService {
  async setStatus(
    accountType: ParticipantAccountType,
    accountId: string,
    status: PresenceStatus
  ): Promise<{ status: PresenceStatus; lastSeenAt: string }> {
    const lastSeenAt = new Date().toISOString();
    const payload = { status, lastSeenAt };
    memoryPresence.set(presenceKey(accountType, accountId), payload);

    const client = await RedisClient.connect();
    if (client) {
      await client.hSet(presenceKey(accountType, accountId), {
        status,
        lastSeenAt,
      });
    }

    return payload;
  }

  async getStatus(
    accountType: ParticipantAccountType,
    accountId: string
  ): Promise<{ status: PresenceStatus; lastSeenAt?: string }> {
    const online = await onlineUsersRegistry.isUserOnline(accountId);
    const client = await RedisClient.connect();

    if (client) {
      const data = await client.hGetAll(presenceKey(accountType, accountId));
      if (data.status && data.lastSeenAt) {
        const status = (online ? data.status : "offline") as PresenceStatus;
        return {
          status: status === "offline" && online ? "online" : status,
          lastSeenAt: data.lastSeenAt,
        };
      }
    }

    const cached = memoryPresence.get(presenceKey(accountType, accountId));
    if (cached) {
      return { status: online ? cached.status : "offline", lastSeenAt: cached.lastSeenAt };
    }

    return { status: online ? "online" : "offline" };
  }

  async getBulkStatuses(
    participants: Array<{ accountType: ParticipantAccountType; accountId: string }>
  ) {
    const entries = await Promise.all(
      participants.map(async (p) => {
        const status = await this.getStatus(p.accountType, p.accountId);
        return [`${p.accountType}:${p.accountId}`, status] as const;
      })
    );

    return Object.fromEntries(entries);
  }

  async handleConnect(accountType: ParticipantAccountType, accountId: string) {
    return this.setStatus(accountType, accountId, "online");
  }

  async handleDisconnect(accountType: ParticipantAccountType, accountId: string) {
    const online = await onlineUsersRegistry.isUserOnline(accountId);
    if (!online) {
      return this.setStatus(accountType, accountId, "offline");
    }
    return this.getStatus(accountType, accountId);
  }
}

export default new PresenceService();
