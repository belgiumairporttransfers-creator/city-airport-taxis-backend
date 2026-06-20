import logger from "@/shared/utils/logger";
import { getRequestContext } from "@/shared/observability/request-context";
import type { AuditLogEntry } from "@/shared/audit/audit.events";
import { AuditLog } from "@/infrastructure/database/models/AuditLog";

class AuditService {
  log(entry: AuditLogEntry): void {
    const ctx = getRequestContext();

    logger.info("audit.event", {
      audit: true,
      event: entry.event,
      actorId: entry.actorId,
      actorType: entry.actorType,
      entityType: entry.entityType,
      entityId: entry.entityId,
      status: entry.status ?? "success",
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      metadata: entry.metadata,
      correlationId: ctx?.correlationId,
      traceId: ctx?.traceId,
    });

    void AuditLog.create({
      event: entry.event,
      actorId: entry.actorId,
      actorType: entry.actorType,
      entityType: entry.entityType,
      entityId: entry.entityId,
      status: entry.status ?? "success",
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      metadata: entry.metadata,
      correlationId: ctx?.correlationId,
      traceId: ctx?.traceId,
    }).catch((error) => {
      logger.error("Failed to persist audit log", { error, event: entry.event });
    });
  }

  logSecurityEvent(
    event: AuditLogEntry["event"],
    actorId: string | undefined,
    actorType: AuditLogEntry["actorType"],
    metadata?: Record<string, unknown>
  ): void {
    this.log({
      event,
      actorId,
      actorType,
      metadata,
      status: event.includes("failed") || event.includes("locked") ? "failed" : "success",
    });
  }
}

export default new AuditService();
