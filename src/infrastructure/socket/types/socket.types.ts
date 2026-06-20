import type { Socket } from "socket.io";
import type { AccountUserType } from "@/modules/auth/types/account-auth";

export interface SocketAuthData {
  userId: string;
  role: string;
  type: AccountUserType;
}

export interface AuthenticatedSocket extends Socket {
  data: SocketAuthData;
}

export interface SocketHealthStatus {
  enabled: boolean;
  initialized: boolean;
  status: "disabled" | "not_initialized" | "running" | "error";
  path?: string;
  connections?: number;
  onlineUsers?: number;
  error?: string;
}
