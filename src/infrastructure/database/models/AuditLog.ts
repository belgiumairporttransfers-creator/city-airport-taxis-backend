import { Schema, model } from "mongoose";
import type { AuditActorType, AuditEvent } from "@/shared/audit/audit.events";

export interface IAuditLog {
  event: AuditEvent;
  actorId?: string;
  actorType: AuditActorType;
  entityType?: string;
  entityId?: string;
  status: "success" | "failed";
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  correlationId?: string;
  traceId?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    event: { type: String, required: true, index: true },
    actorId: { type: String, index: true },
    actorType: { type: String, enum: ["admin", "user", "system"], required: true },
    entityType: { type: String },
    entityId: { type: String },
    status: { type: String, enum: ["success", "failed"], default: "success" },
    ipAddress: { type: String },
    userAgent: { type: String },
    metadata: { type: Schema.Types.Mixed },
    correlationId: { type: String, index: true },
    traceId: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

export const AuditLog = model<IAuditLog>("AuditLog", auditLogSchema);
