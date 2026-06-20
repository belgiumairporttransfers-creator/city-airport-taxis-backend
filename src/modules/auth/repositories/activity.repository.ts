import { Types } from "mongoose";
import type {
  AccountUserType,
  ActivityStatus,
  ActivityType,
} from "@/modules/auth/types/account-auth";
import { Activity } from "@/infrastructure/database/models/Activity";

class ActivityRepository {
  create(data: Record<string, unknown>) {
    return Activity.create(data);
  }

  findRecent(accountId: string, userType: AccountUserType, limit = 10) {
    return Activity.find({ user: new Types.ObjectId(accountId), userType })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
  }

  log(
    accountId: string,
    userType: AccountUserType,
    data: {
      type: ActivityType;
      status?: ActivityStatus;
      ipAddress: string;
      userAgent: string;
      device?: string;
      browser?: string;
      os?: string;
    }
  ) {
    return Activity.create({
      user: new Types.ObjectId(accountId),
      userType,
      type: data.type,
      status: data.status ?? "success",
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      device: data.device,
      browser: data.browser,
      os: data.os,
    });
  }
}

export default new ActivityRepository();
