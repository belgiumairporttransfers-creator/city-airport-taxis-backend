import type { AccountUserType } from "./account-auth";

export interface TokenPayload {
  id: string;
  role: string;
  type: AccountUserType;
  iat?: number;
  exp?: number;
}

export interface AuthAuditContext {
  ip?: string;
  userAgent: string;
}

export interface AuthListQuery {
  page?: number;
  limit?: number;
}

export const ADMIN_ACCOUNT_TYPE = "admin" as const satisfies AccountUserType;
export const USER_ACCOUNT_TYPE = "user" as const satisfies AccountUserType;
export const USER_ROLE = "user" as const;
export const DRIVER_ROLE = "driver" as const;

export const toUserTokenPayload = (accountId: string, role: string = USER_ROLE): TokenPayload =>
  toTokenPayload(accountId, role, USER_ACCOUNT_TYPE);

export const toTokenPayload = (
  accountId: string,
  role: string,
  accountType: AccountUserType
): TokenPayload => ({
  id: accountId,
  role,
  type: accountType,
});
