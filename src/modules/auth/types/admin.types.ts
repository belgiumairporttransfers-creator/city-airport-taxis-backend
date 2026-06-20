import { Document } from "mongoose";

export type AdminRole = "admin";

export interface IAdmin extends Document {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  avatar?: string;
  password: string;
  role: AdminRole;
  lastLogin?: Date;
  passwordChangedAt?: Date;
  failedLoginAttempts: number;
  lockUntil?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  comparePassword(password: string): Promise<boolean>;
}
