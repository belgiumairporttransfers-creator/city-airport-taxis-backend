import { Schema, model } from "mongoose";
import bcrypt from "bcryptjs";
import { env } from "@/config/env";
import { USER_ROLE, DRIVER_ROLE } from "@/modules/auth/types/auth.types";
import type { IUser } from "@/modules/auth/types/user.types";
import { stripSensitiveFields } from "@/shared/utils/sanitize-document";

const sanitizeTransform = (_doc: unknown, ret: Record<string, unknown>) =>
  stripSensitiveFields(ret);

const userSchema = new Schema<IUser>(
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

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please enter a valid email address"],
    },

    phoneNumber: {
      type: String,
      trim: true,
    },

    avatar: {
      type: String,
      trim: true,
    },
    companyName: {
      type: String,
      trim: true,
    },
    businessProfile: {
      type: String,
      trim: true,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },

    role: {
      type: String,
      enum: [USER_ROLE, DRIVER_ROLE],
      default: USER_ROLE,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
    },
    statusReason: {
      type: String,
      trim: true,
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
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
  },
  {
    timestamps: true,
    toJSON: { transform: sanitizeTransform },
    toObject: { transform: sanitizeTransform },
  }
);

userSchema.index({ resetPasswordToken: 1 }, { sparse: true });
userSchema.index({ emailVerificationToken: 1 }, { sparse: true });
userSchema.index({ lockUntil: 1 }, { sparse: true });

userSchema.pre<IUser>("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  const salt = await bcrypt.genSalt(env.BCRYPT_ROUNDS);

  this.password = await bcrypt.hash(this.password, salt);

  next();
});

userSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

export const User = model<IUser>("User", userSchema);
