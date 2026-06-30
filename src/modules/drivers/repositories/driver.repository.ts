import { Driver } from "@/infrastructure/database/models/Driver";
import { AppError } from "@/shared/errors/AppError";
import type {
  DriverStatus,
  GetDriversQuery,
  SubmitDriverData,
  UpdateDriverData,
} from "@/modules/drivers/types/driver.types";
import APIFeature from "@/shared/utils/APIFeature";

const isDuplicateKeyError = (error: unknown): error is { code: number } =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code: number }).code === 11000;

class DriverRepository {
  async create(
    data: SubmitDriverData & {
      applicationNumber: string;
      status?: DriverStatus;
      about?: string;
      skills?: string[];
      profilePhoto?: string;
    }
  ) {
    try {
      return await Driver.create(data);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new AppError("An active driver already exists for this email", 409);
      }

      throw error;
    }
  }

  findById(id: string) {
    return Driver.findById(id);
  }

  findByApplicationNumber(applicationNumber: string) {
    return Driver.findOne({
      applicationNumber: applicationNumber.trim().toUpperCase(),
    });
  }

  async findMaxApplicationSequence() {
    const [latest] = await Driver.aggregate<{ sequence: number }>([
      {
        $match: {
          applicationNumber: { $regex: /^DRV-\d{4}$/i },
        },
      },
      {
        $project: {
          sequence: {
            $toInt: {
              $substrCP: ["$applicationNumber", 4, 4],
            },
          },
        },
      },
      { $sort: { sequence: -1 } },
      { $limit: 1 },
    ]);

    return latest?.sequence ?? 0;
  }

  findByEmail(email: string) {
    return Driver.findOne({ email: email.trim().toLowerCase() }).sort({ createdAt: -1 });
  }

  findActiveByEmail(email: string) {
    return Driver.findOne({
      email: email.trim().toLowerCase(),
      status: { $in: ["pending", "under_review", "changes_requested", "approved", "suspended"] },
    });
  }

  findByUserId(userId: string) {
    return Driver.findOne({ userId }).sort({ updatedAt: -1 });
  }

  findApprovedWithPortalAccess() {
    return Driver.find({
      status: "approved",
      userId: { $exists: true, $ne: null },
      email: { $exists: true, $ne: "" },
    })
      .select("firstName lastName email userId")
      .lean();
  }

  findWithPagination(query: GetDriversQuery) {
    return new APIFeature(Driver, query, {
      pagination: { defaultLimit: 20 },
      sort: {
        defaultSort: "-createdAt",
        allowedFields: [
          "createdAt",
          "updatedAt",
          "firstName",
          "lastName",
          "email",
          "status",
          "applicationNumber",
          "licensePlate",
        ],
      },
      search: {
        searchFields: [
          "firstName",
          "lastName",
          "email",
          "applicationNumber",
          "licensePlate",
          "phone",
        ],
      },
      filterFields: ["status"],
      excludeFields: ["__v", "reviews"],
      lean: true,
    }).execute();
  }

  updateById(id: string, data: UpdateDriverData & Record<string, unknown>) {
    return Driver.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async countByStatus() {
    const results = await Driver.aggregate<{
      _id: DriverStatus;
      count: number;
    }>([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    return results.map((item) => ({
      status: item._id,
      count: item.count,
    }));
  }
}

export default new DriverRepository();
