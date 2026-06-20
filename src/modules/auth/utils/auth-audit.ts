import { Request } from "express";
import type { AuthAuditContext } from "../types/auth.types";

export const getAuthAuditContext = (req: Request): AuthAuditContext => ({
  ip: req.ip,
  userAgent: req.get("user-agent") || "unknown",
});
