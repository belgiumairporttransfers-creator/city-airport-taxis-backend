import { UAParser } from "ua-parser-js";
import type { AuthAuditContext } from "@/modules/auth/types/auth.types";
import type { AccountUserType, ActivityStatus, ActivityType } from "@/modules/auth/types/account-auth";
import logger from "@/shared/utils/logger";
import auditService from "@/shared/audit/audit.service";
import { AuditEvents } from "@/shared/audit/audit.events";
import activityRepository from "@/modules/auth/repositories/activity.repository";

class AuthActivityService {
  async log(
    accountId: string,
    userType: AccountUserType,
    audit: AuthAuditContext,
    type: ActivityType,
    status: ActivityStatus = "success"
  ): Promise<void> {
    const { ip, userAgent } = audit;

    try {
      const parser = new UAParser(userAgent);
      const result = parser.getResult();

      await activityRepository.log(accountId, userType, {
        type,
        status,
        ipAddress: ip || "unknown",
        userAgent,
        device: result.device.model || "Desktop",
        browser: result.browser.name,
        os: result.os.name,
      });

      auditService.log({
        event: mapActivityToAuditEvent(type, status),
        actorId: accountId,
        actorType: userType,
        status,
        ipAddress: ip || "unknown",
        userAgent,
        metadata: { activityType: type },
      });
    } catch (err) {
      logger.error("Activity logging failed", { err, accountId, userType, type });
    }
  }

  async getRecent(accountId: string, userType: AccountUserType, limit = 10) {
    return activityRepository.findRecent(accountId, userType, limit);
  }
}

export default new AuthActivityService();

const mapActivityToAuditEvent = (
  type: ActivityType,
  status: ActivityStatus
): (typeof AuditEvents)[keyof typeof AuditEvents] => {
  if (type === "login" && status === "failed") return AuditEvents.LOGIN_FAILED;
  if (type === "login") return AuditEvents.LOGIN_SUCCESS;
  if (type === "logout") return AuditEvents.LOGOUT;
  if (type === "logout_all") return AuditEvents.LOGOUT_ALL;
  if (type === "password_change") return AuditEvents.PASSWORD_CHANGE;
  if (type === "password_reset_request") return AuditEvents.PASSWORD_RESET_REQUEST;
  if (type === "password_reset") return AuditEvents.PASSWORD_RESET;
  if (type === "email_verified") return AuditEvents.EMAIL_VERIFIED;
  if (type === "session_revoked") return AuditEvents.SESSION_REVOKED;
  if (type === "update_profile") return AuditEvents.PROFILE_UPDATE;
  return AuditEvents.RECORD_UPDATE;
};
