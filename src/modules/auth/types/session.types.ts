import { Document, Types } from "mongoose";
import type { AccountUserType } from "./account-auth";

export interface ISession extends Document {
  user: Types.ObjectId;
  userType: AccountUserType;
  refreshToken: string;
  ipAddress: string;
  userAgent: string;
  device?: string;
  browser?: string;
  os?: string;
  isValid: boolean;
  expiresAt: Date;
}
