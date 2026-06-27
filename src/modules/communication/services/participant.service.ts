import { Admin } from "@/infrastructure/database/models/Admin";
import { User } from "@/infrastructure/database/models/User";
import { DriverApplication } from "@/infrastructure/database/models/DriverApplication";
import { AppError } from "@/shared/errors/AppError";
import { DRIVER_ROLE } from "@/modules/auth/types/auth.types";
import type {
  CommunicationActor,
  ConversationParticipant,
  ParticipantAccountType,
  ParticipantRole,
} from "@/modules/communication/types/communication.types";

class ParticipantService {
  async resolveParticipant(
    accountType: ParticipantAccountType,
    accountId: string
  ): Promise<ConversationParticipant> {
    if (accountType === "admin") {
      const admin = await Admin.findById(accountId).lean();
      if (!admin) {
        throw new AppError("Admin not found", 404);
      }

      return {
        accountType: "admin",
        accountId: String(admin._id),
        role: "admin",
        displayName: `${admin.firstName} ${admin.lastName}`.trim(),
        avatarUrl: admin.avatar,
        unreadCount: 0,
        isMuted: false,
        joinedAt: new Date(),
      };
    }

    const user = await User.findById(accountId).lean();
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const role: ParticipantRole = user.role === DRIVER_ROLE ? "driver" : "customer";

    return {
      accountType: "user",
      accountId: String(user._id),
      role,
      displayName: `${user.firstName} ${user.lastName}`.trim(),
      avatarUrl: user.avatar,
      unreadCount: 0,
      isMuted: false,
      joinedAt: new Date(),
    };
  }

  validateConversationCreation(actor: CommunicationActor, target: ConversationParticipant): void {
    if (actor.accountType === "user" && actor.role === "driver") {
      if (target.accountType !== "admin") {
        throw new AppError("Drivers can only start conversations with admins", 403);
      }
      return;
    }

    if (actor.accountType === "admin") {
      if (target.accountType === "user" && target.role === "driver") {
        return;
      }
      if (target.accountType === "admin") {
        throw new AppError("Admin-to-admin conversations are not supported in Phase 1", 403);
      }
      throw new AppError(
        "Admins can only start conversations with approved drivers in Phase 1",
        403
      );
    }

    throw new AppError("You are not allowed to create conversations", 403);
  }

  async assertDriverEligible(driverUserId: string): Promise<void> {
    const application = await DriverApplication.findOne({
      userId: driverUserId,
      status: "approved",
    }).lean();

    if (!application) {
      throw new AppError("Driver must be approved before messaging", 403);
    }
  }

  getActorParticipant(actor: CommunicationActor): ConversationParticipant {
    return {
      accountType: actor.accountType,
      accountId: actor.accountId,
      role: actor.role,
      displayName: actor.displayName,
      avatarUrl: actor.avatarUrl,
      unreadCount: 0,
      isMuted: false,
      joinedAt: new Date(),
    };
  }
}

export default new ParticipantService();
