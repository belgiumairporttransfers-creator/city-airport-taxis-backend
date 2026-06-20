import type { Socket } from "socket.io";
import { verifyAccessTokenAccount } from "@/modules/auth/utils/auth-account";
import logger from "@/shared/utils/logger";

const parseCookies = (cookieHeader?: string): Record<string, string> => {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(";").reduce<Record<string, string>>((acc, part) => {
    const [rawKey, ...rest] = part.trim().split("=");
    if (!rawKey) {
      return acc;
    }
    acc[rawKey] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
};

const extractAccessToken = (socket: Socket): string | undefined => {
  const authToken = socket.handshake.auth?.token;
  if (typeof authToken === "string" && authToken.length > 0) {
    return authToken;
  }

  const authorization = socket.handshake.headers.authorization;
  if (typeof authorization === "string" && authorization.startsWith("Bearer ")) {
    return authorization.slice(7);
  }

  const cookies = parseCookies(socket.handshake.headers.cookie);
  return cookies.userAccessToken || cookies.accessToken;
};

export const socketAuthMiddleware = async (
  socket: Socket,
  next: (err?: Error) => void
): Promise<void> => {
  try {
    const token = extractAccessToken(socket);
    if (!token) {
      return next(new Error("Authentication required"));
    }

    const account = await verifyAccessTokenAccount(token);

    socket.data.userId = account.userId;
    socket.data.role = account.role;
    socket.data.type = account.type;

    next();
  } catch (error) {
    logger.warn("Socket authentication failed", {
      socketId: socket.id,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    next(new Error("Invalid or expired token"));
  }
};
