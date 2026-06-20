import { Schema, model } from "mongoose";
import bcrypt from "bcryptjs";
import { env } from "@/config/env";
import type { IAdmin } from "@/modules/auth/types/admin.types";
import { stripSensitiveFields } from "@/shared/utils/sanitize-document";

const sanitizeTransform = (_doc: unknown, ret: Record<string, unknown>) =>
  stripSensitiveFields(ret);

const adminSchema = new Schema<IAdmin>(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    avatar: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please fill a valid email address"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },
    role: {
      type: String,
      enum: ["admin"],
      default: "admin",
    },
    lastLogin: {
      type: Date,
    },
    passwordChangedAt: {
      type: Date,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
  },
  {
    timestamps: true,
    toJSON: { transform: sanitizeTransform },
    toObject: { transform: sanitizeTransform },
  }
);

adminSchema.index({ resetPasswordToken: 1 }, { sparse: true });
adminSchema.index({ lockUntil: 1 }, { sparse: true });

adminSchema.pre<IAdmin>("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  const salt = await bcrypt.genSalt(env.BCRYPT_ROUNDS);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

adminSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

export const Admin = model<IAdmin>("Admin", adminSchema);
