import { Types } from "mongoose";

export type AccountUserType = "admin" | "user";

export type ActivityType =
  | "login"
  | "logout"
  | "password_change"
  | "password_reset"
  | "password_reset_request"
  | "update_profile"
  | "logout_all"
  | "email_verified"
  | "session_revoked";

export type ActivityStatus = "success" | "failed";

export interface SessionAccountRef {
  user: Types.ObjectId;
  userType: AccountUserType;
}
