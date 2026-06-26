import { Document } from "mongoose";
import { DRIVER_ROLE, USER_ROLE } from "./auth.types";

export type UserRole = typeof USER_ROLE | typeof DRIVER_ROLE;
export type UserStatus = "active" | "suspended";

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  avatar?: string;
  companyName?: string;
  businessProfile?: string;
  password: string;
  role: UserRole;
  isVerified: boolean;
  status: UserStatus;
  statusReason?: string;
  lastLogin?: Date;
  passwordChangedAt?: Date;
  failedLoginAttempts: number;
  lockUntil?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  comparePassword(password: string): Promise<boolean>;
  createdAt?: Date;
  updatedAt?: Date;
}
