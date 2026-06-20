import { RedisClient } from "@/infrastructure/redis/client";

const ONLINE_USERS_KEY = "socket:online:users";
const USER_SOCKETS_PREFIX = "socket:online:user:";
const SOCKET_USER_PREFIX = "socket:online:socket:";
const SOCKET_TTL_SECONDS = 86_400;

export class InMemoryOnlineUsersRegistry {
  private readonly userSockets = new Map<string, Set<string>>();
  private readonly socketUsers = new Map<string, string>();

  register(userId: string, socketId: string): void {
    const sockets = this.userSockets.get(userId) ?? new Set<string>();
    sockets.add(socketId);
    this.userSockets.set(userId, sockets);
    this.socketUsers.set(socketId, userId);
  }

  unregister(socketId: string): void {
    const userId = this.socketUsers.get(socketId);
    if (!userId) return;

    this.socketUsers.delete(socketId);
    const sockets = this.userSockets.get(userId);
    if (!sockets) return;

    sockets.delete(socketId);
    if (sockets.size === 0) {
      this.userSockets.delete(userId);
    }
  }

  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  getOnlineUserCount(): number {
    return this.userSockets.size;
  }

  getConnectionCount(): number {
    return this.socketUsers.size;
  }

  getOnlineUserIds(): string[] {
    return [...this.userSockets.keys()];
  }

  getLocalSocketIds(): string[] {
    return [...this.socketUsers.keys()];
  }

  clear(): void {
    this.userSockets.clear();
    this.socketUsers.clear();
  }
}

const memoryRegistry = new InMemoryOnlineUsersRegistry();

const userSocketsKey = (userId: string) => `${USER_SOCKETS_PREFIX}${userId}`;
const socketUserKey = (socketId: string) => `${SOCKET_USER_PREFIX}${socketId}`;

class OnlineUsersRegistry {
  private readonly memory = memoryRegistry;

  async register(userId: string, socketId: string): Promise<void> {
    this.memory.register(userId, socketId);

    const client = await RedisClient.connect();
    if (!client) return;

    await client.set(socketUserKey(socketId), userId, { EX: SOCKET_TTL_SECONDS });
    await client.sAdd(userSocketsKey(userId), socketId);
    await client.sAdd(ONLINE_USERS_KEY, userId);
  }

  async unregister(socketId: string): Promise<void> {
    this.memory.unregister(socketId);

    const client = await RedisClient.connect();
    if (!client) return;

    const userId = await client.get(socketUserKey(socketId));
    if (!userId) return;

    await client.del(socketUserKey(socketId));
    await client.sRem(userSocketsKey(userId), socketId);

    const remaining = await client.sCard(userSocketsKey(userId));
    if (remaining === 0) {
      await client.del(userSocketsKey(userId));
      await client.sRem(ONLINE_USERS_KEY, userId);
    }
  }

  async isUserOnline(userId: string): Promise<boolean> {
    const client = await RedisClient.connect();
    if (client) {
      return client.sIsMember(ONLINE_USERS_KEY, userId);
    }
    return this.memory.isUserOnline(userId);
  }

  async getOnlineUserCount(): Promise<number> {
    const client = await RedisClient.connect();
    if (client) {
      return client.sCard(ONLINE_USERS_KEY);
    }
    return this.memory.getOnlineUserCount();
  }

  getConnectionCount(): number {
    return this.memory.getConnectionCount();
  }

  async getOnlineUserIds(): Promise<string[]> {
    const client = await RedisClient.connect();
    if (client) {
      return client.sMembers(ONLINE_USERS_KEY);
    }
    return this.memory.getOnlineUserIds();
  }

  async clear(): Promise<void> {
    const localSocketIds = [...this.memory.getLocalSocketIds()];
    this.memory.clear();

    const client = await RedisClient.connect();
    if (!client) return;

    for (const socketId of localSocketIds) {
      const userId = await client.get(socketUserKey(socketId));
      if (!userId) continue;

      await client.del(socketUserKey(socketId));
      await client.sRem(userSocketsKey(userId), socketId);

      const remaining = await client.sCard(userSocketsKey(userId));
      if (remaining === 0) {
        await client.del(userSocketsKey(userId));
        await client.sRem(ONLINE_USERS_KEY, userId);
      }
    }
  }
}

export const onlineUsersRegistry = new OnlineUsersRegistry();
