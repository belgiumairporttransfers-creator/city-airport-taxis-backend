import { AppError } from "@/shared/errors/AppError";
import auditService from "@/shared/audit/audit.service";
import { AuditEvents } from "@/shared/audit/audit.events";
import authActivityService from "./auth-activity.service";
import type { AuthAuditContext } from "../types/auth.types";
import type { AccountUserType } from "../types/account-auth";

const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 30 * 60 * 1000;

interface LockableAccount {
  failedLoginAttempts: number;
  lockUntil?: Date;
  _id: { toString(): string };
  comparePassword(password: string): Promise<boolean>;
  save(): Promise<unknown>;
}

class AuthLockoutService {
  assertNotLocked(account: LockableAccount, userType: AccountUserType): void {
    if (account.lockUntil && account.lockUntil > new Date()) {
      auditService.logSecurityEvent(
        AuditEvents.SECURITY_ACCOUNT_LOCKED,
        account._id.toString(),
        userType
      );
      throw new AppError("Account is temporarily locked. Please try again later.", 423);
    }
  }

  async verifyPassword(
    account: LockableAccount,
    password: string,
    userType: AccountUserType,
    audit: AuthAuditContext
  ): Promise<boolean> {
    const valid = await account.comparePassword(password);
    if (valid) {
      account.failedLoginAttempts = 0;
      account.lockUntil = undefined;
      await account.save();
      return true;
    }

    await this.recordFailedAttempt(account, userType, audit);
    return false;
  }

  private async recordFailedAttempt(
    account: LockableAccount,
    userType: AccountUserType,
    audit: AuthAuditContext
  ): Promise<void> {
    account.failedLoginAttempts += 1;
    if (account.failedLoginAttempts >= MAX_ATTEMPTS) {
      account.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
      account.failedLoginAttempts = 0;
    }
    await account.save();
    await authActivityService.log(account._id.toString(), userType, audit, "login", "failed");
  }
}

export default new AuthLockoutService();
