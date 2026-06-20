import { AsyncLocalStorage } from "async_hooks";
import { randomUUID } from "crypto";

export interface RequestContext {
  correlationId: string;
  traceId: string;
  userId?: string;
  adminId?: string;
  userType?: "admin" | "user";
}

const storage = new AsyncLocalStorage<RequestContext>();

export const runWithRequestContext = <T>(context: RequestContext, fn: () => T): T =>
  storage.run(context, fn);

export const getRequestContext = (): RequestContext | undefined => storage.getStore();

export const createRequestContext = (incomingCorrelationId?: string): RequestContext => ({
  correlationId: incomingCorrelationId || randomUUID(),
  traceId: randomUUID(),
});

export const bindUserContext = (userId: string, userType: "admin" | "user"): void => {
  const ctx = storage.getStore();
  if (!ctx) return;

  if (userType === "admin") {
    ctx.adminId = userId;
  } else {
    ctx.userId = userId;
  }
  ctx.userType = userType;
};
