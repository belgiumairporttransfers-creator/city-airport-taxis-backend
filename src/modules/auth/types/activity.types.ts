import { Document, Types } from "mongoose";
import type { AccountUserType, ActivityStatus, ActivityType } from "./account-auth";

export interface IActivity extends Document {
  user: Types.ObjectId;
  userType: AccountUserType;
  type: ActivityType;
  status: ActivityStatus;
  ipAddress: string;
  userAgent: string;
  device?: string;
  browser?: string;
  os?: string;
  timestamp: Date;
}
