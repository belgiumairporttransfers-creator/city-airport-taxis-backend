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

  // Customers
  CUSTOMER_CREATED: "customer.created",
  CUSTOMER_UPDATED: "customer.updated",
  CUSTOMER_ARCHIVED: "customer.archived",
  CUSTOMER_RESTORED: "customer.restored",

  // Vehicle categories
  VEHICLE_CATEGORY_CREATED: "vehicle-category.created",
  VEHICLE_CATEGORY_UPDATED: "vehicle-category.updated",
  VEHICLE_CATEGORY_DELETED: "vehicle-category.deleted",

  // Vehicles
  VEHICLE_CREATED: "vehicle.created",
  VEHICLE_UPDATED: "vehicle.updated",
  VEHICLE_DELETED: "vehicle.deleted",

  // Vehicle pricing
  VEHICLE_PRICING_CREATED: "vehicle-pricing.created",
  VEHICLE_PRICING_UPDATED: "vehicle-pricing.updated",
  VEHICLE_PRICING_DELETED: "vehicle-pricing.deleted",
  VEHICLE_PRICING_VALIDATED: "vehicle-pricing.validated",

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
