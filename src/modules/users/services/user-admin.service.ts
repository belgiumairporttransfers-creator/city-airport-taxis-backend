import { FilterQuery, Types } from "mongoose";
import { User } from "@/infrastructure/database/models/User";
import { Activity } from "@/infrastructure/database/models/Activity";
import { Customer } from "@/infrastructure/database/models/Customer";
import authSessionService from "@/modules/auth/services/auth-session.service";
import { USER_ACCOUNT_TYPE } from "@/modules/auth/types/auth.types";
import { AppError } from "@/shared/errors/AppError";
import auditService from "@/shared/audit/audit.service";
import { AuditEvents } from "@/shared/audit/audit.events";
import type { IUser } from "@/modules/auth/types/user.types";
import type {
  GetUsersQuery,
  UserAdminResponse,
  UserAdminStatsResponse,
} from "../types/user-admin.types";

export const toUserAdminResponse = (user: IUser): UserAdminResponse => {
  const fullName =
    user.fullName?.trim() ||
    user.name?.trim() ||
    (user.firstName && user.lastName && user.firstName !== user.lastName
      ? `${user.firstName} ${user.lastName}`.trim()
      : user.firstName || user.lastName || "") ||
    "User";

  return {
    _id: user._id.toString(),
    firstName: user.firstName || "",
    lastName: user.firstName === user.lastName ? "" : (user.lastName || ""),
    fullName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    avatar: user.avatar,
    companyName: user.companyName,
    businessProfile: user.businessProfile,
    role: user.role,
    status: user.status,
    statusReason: user.statusReason,
    isVerified: Boolean(user.isVerified),
    lastLogin: user.lastLogin,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

class UserAdminService {
  async getUsers(query: GetUsersQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const filter: FilterQuery<IUser> = {};

    // Filter by role (default to "user", allow "driver" or "all")
    if (query.role && query.role !== "all") {
      filter.role = query.role;
    } else if (!query.role) {
      filter.role = "user";
    }

    // Filter by status
    if (query.status && query.status !== "all") {
      filter.status = query.status;
    }

    // Filter by verification status
    if (query.isVerified !== undefined && query.isVerified !== "all") {
      filter.isVerified = query.isVerified === true || query.isVerified === "true";
    }

    // Search query
    if (query.search?.trim()) {
      const searchRegex = new RegExp(query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [
        { fullName: searchRegex },
        { name: searchRegex },
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { phoneNumber: searchRegex },
        { companyName: searchRegex },
      ];
    }

    // Sorting
    const sortBy = query.sortBy || "createdAt";
    const sortOrder = query.sortOrder === "asc" ? 1 : -1;
    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder };

    const [items, total] = await Promise.all([
      User.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      User.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items: (items as unknown as IUser[]).map(toUserAdminResponse),
      page,
      limit,
      total,
      totalPages,
    };
  }

  async getUserStats(): Promise<UserAdminStatsResponse> {
    const [total, active, suspended, verified, unverified] = await Promise.all([
      User.countDocuments({ role: "user" }),
      User.countDocuments({ role: "user", status: "active" }),
      User.countDocuments({ role: "user", status: "suspended" }),
      User.countDocuments({ role: "user", isVerified: true }),
      User.countDocuments({ role: "user", isVerified: false }),
    ]);

    return {
      total,
      active,
      suspended,
      verified,
      unverified,
    };
  }

  async getUser(id: string): Promise<UserAdminResponse> {
    const user = await User.findById(id).lean();
    if (!user) {
      throw new AppError("User not found", 404);
    }
    return toUserAdminResponse(user as unknown as IUser);
  }

  async deleteUser(id: string, adminId: string) {
    const user = await User.findById(id);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const userEmail = user.email;
    const userName = `${user.firstName} ${user.lastName}`;

    // 1. Invalidate all active sessions for this user
    await authSessionService.invalidateAll(id, USER_ACCOUNT_TYPE);

    // 2. Remove all auth activities
    await Activity.deleteMany({ user: new Types.ObjectId(id) });

    // 3. Unlink customer document if linked to this user
    await Customer.updateMany(
      { userId: new Types.ObjectId(id) },
      { $unset: { userId: 1 } }
    );

    // 4. Permanently delete user document from database
    await User.findByIdAndDelete(id);

    // 5. Log audit event
    auditService.log({
      event: AuditEvents.RECORD_DELETE,
      actorId: adminId,
      actorType: "admin",
      status: "success",
      entityType: "user",
      entityId: id,
      metadata: {
        action: "user_deleted",
        deletedEmail: userEmail,
        deletedName: userName,
      },
    });

    return {
      message: `User ${userName} (${userEmail}) has been permanently deleted.`,
    };
  }

  async bulkDeleteUsers(ids: string[], adminId: string) {
    const objectIds = ids.map((id) => new Types.ObjectId(id));

    // Fetch users to know their details for audit
    const users = await User.find({ _id: { $in: objectIds } }).select("email firstName lastName");

    // Invalidate all sessions for each user
    await Promise.all(
      ids.map((id) => authSessionService.invalidateAll(id, USER_ACCOUNT_TYPE))
    );

    // Remove all auth activities
    await Activity.deleteMany({ user: { $in: objectIds } });

    // Unlink customer records
    await Customer.updateMany(
      { userId: { $in: objectIds } },
      { $unset: { userId: 1 } }
    );

    // Permanently delete users
    const deleteResult = await User.deleteMany({ _id: { $in: objectIds } });

    // Log audit
    auditService.log({
      event: AuditEvents.RECORD_DELETE,
      actorId: adminId,
      actorType: "admin",
      status: "success",
      entityType: "user",
      metadata: {
        action: "bulk_users_deleted",
        count: deleteResult.deletedCount,
        deletedUsers: users.map((u) => ({ id: u._id.toString(), email: u.email })),
      },
    });

    return {
      deletedCount: deleteResult.deletedCount,
      message: `${deleteResult.deletedCount} user account(s) permanently deleted.`,
    };
  }

  async updateUserStatus(id: string, status: "active" | "suspended", reason?: string) {
    const user = await User.findById(id);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    user.status = status;
    if (reason !== undefined) {
      user.statusReason = reason;
    }

    // If suspended, invalidate sessions so user is immediately logged out
    if (status === "suspended") {
      await authSessionService.invalidateAll(id, USER_ACCOUNT_TYPE);
    }

    await user.save();
    return toUserAdminResponse(user);
  }
}

export default new UserAdminService();
