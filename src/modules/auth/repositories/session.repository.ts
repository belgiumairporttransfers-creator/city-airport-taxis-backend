import { Types } from "mongoose";
import type { AccountUserType } from "@/modules/auth/types/account-auth";
import { Session } from "@/infrastructure/database/models/Session";

class SessionRepository {
  create(data: Record<string, unknown>) {
    return Session.create(data);
  }

  findOneAndUpdateRefreshToken(
    hashedToken: string,
    userType: AccountUserType,
    userId: string,
    newHashedRefresh: string
  ) {
    return Session.findOneAndUpdate(
      {
        refreshToken: hashedToken,
        isValid: true,
        expiresAt: { $gt: new Date() },
        userType,
        user: new Types.ObjectId(userId),
      },
      { $set: { refreshToken: newHashedRefresh } },
      { new: true }
    );
  }

  invalidateByRefreshToken(refreshToken: string, userId: string, userType: AccountUserType) {
    return Session.findOneAndUpdate(
      { refreshToken, user: new Types.ObjectId(userId), userType },
      { isValid: false }
    );
  }

  invalidateAllForUser(userId: string, userType: AccountUserType) {
    return Session.updateMany(
      { user: new Types.ObjectId(userId), userType },
      { isValid: false }
    );
  }

  findValidForUser(userId: string, userType: AccountUserType) {
    return Session.find({
      user: new Types.ObjectId(userId),
      userType,
      isValid: true,
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .select("-refreshToken")
      .lean();
  }

  revokeById(sessionId: string, userId: string, userType: AccountUserType) {
    return Session.findOneAndUpdate(
      {
        _id: new Types.ObjectId(sessionId),
        user: new Types.ObjectId(userId),
        userType,
      },
      { isValid: false }
    );
  }

  findValidSessionIds(userId: string, userType: AccountUserType) {
    return Session.find({
      user: new Types.ObjectId(userId),
      userType,
      isValid: true,
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: 1 })
      .select("_id");
  }

  invalidateByIds(ids: Types.ObjectId[]) {
    return Session.updateMany({ _id: { $in: ids } }, { isValid: false });
  }
}

export default new SessionRepository();
