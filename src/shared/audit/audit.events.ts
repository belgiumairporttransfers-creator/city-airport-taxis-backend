export const AuditEvents = {
  // Authentication
  LOGIN_SUCCESS: "login.success",
  LOGIN_FAILED: "login.failed",
  LOGOUT: "logout",
  LOGOUT_ALL: "logout.all",
  PASSWORD_CHANGE: "password.change",
  PASSWORD_RESET_REQUEST: "password.reset.request",
  PASSWORD_RESET: "password.reset",
  EMAIL_VERIFIED: "email.verified",
  SESSION_REVOKED: "session.revoked",

  // Profile
  PROFILE_UPDATE: "profile.update",

  // Records
  RECORD_CREATE: "record.create",
  RECORD_UPDATE: "record.update",
  RECORD_DELETE: "record.delete",

  // Security
  SECURITY_SUSPICIOUS_LOGIN: "security.suspicious_login",
  SECURITY_ACCOUNT_LOCKED: "security.account_locked",
  SECURITY_CSRF_VIOLATION: "security.csrf_violation",
} as const;

export type AuditEvent = (typeof AuditEvents)[keyof typeof AuditEvents];

export type AuditActorType = "admin" | "user" | "system";

export interface AuditLogEntry {
  event: AuditEvent;
  actorId?: string;
  actorType: AuditActorType;
  entityType?: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  status?: "success" | "failed";
}
