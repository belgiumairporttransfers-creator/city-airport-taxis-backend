import type { Request } from "express";
import { AppError } from "@/shared/errors/AppError";
import { DRIVER_ROLE } from "@/modules/auth/types/auth.types";
import type { CommunicationActor } from "@/modules/communication/types/communication.types";

export const resolveActorFromRequest = (req: Request): CommunicationActor => {
  if (req.admin) {
    return {
      accountType: "admin",
      accountId: req.admin._id.toString(),
      role: "admin",
      displayName: `${req.admin.firstName} ${req.admin.lastName}`.trim(),
      avatarUrl: req.admin.avatar,
    };
  }

  if (req.user) {
    const role = req.user.role === DRIVER_ROLE ? "driver" : "customer";
    return {
      accountType: "user",
      accountId: req.user._id.toString(),
      role,
      displayName: `${req.user.firstName} ${req.user.lastName}`.trim(),
      avatarUrl: req.user.avatar,
    };
  }

  throw new AppError("Unauthorized", 401);
};

export const resolveSocketActor = (data: {
  userId: string;
  type: "admin" | "user";
  role?: string;
}): CommunicationActor => {
  if (data.type === "admin") {
    return {
      accountType: "admin",
      accountId: data.userId,
      role: "admin",
      displayName: "",
    };
  }

  return {
    accountType: "user",
    accountId: data.userId,
    role: data.role === DRIVER_ROLE ? "driver" : "customer",
    displayName: "",
  };
};

export const buildMessagePreview = (type: string, content?: string): string => {
  switch (type) {
    case "image":
      return "Photo";
    case "document":
      return "Document";
    case "voice":
      return "Voice message";
    case "location":
      return "Location";
    case "system":
      return content?.slice(0, 120) || "System message";
    default:
      return content?.slice(0, 120) || "";
  }
};
