import { DriverApplication } from "@/infrastructure/database/models/DriverApplication";
import { AppError } from "@/shared/errors/AppError";
import type {
  DriverApplicationStatus,
  GetDriverApplicationsQuery,
  SubmitDriverApplicationData,
  UpdateDriverApplicationData,
} from "@/modules/drivers/types/driver.types";
import APIFeature from "@/shared/utils/APIFeature";

const isDuplicateKeyError = (error: unknown): error is { code: number } =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code: number }).code === 11000;

class DriverRepository {
  async create(
    data: SubmitDriverApplicationData & {
      applicationNumber: string;
      status?: DriverApplicationStatus;
      about?: string;
      skills?: string[];
      profilePhoto?: string;
    }
  ) {
    try {
      return await DriverApplication.create(data);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new AppError("An active driver application already exists for this email", 409);
      }

      throw error;
    }
  }

  findById(id: string) {
    return DriverApplication.findById(id);
  }

  findByApplicationNumber(applicationNumber: string) {
    return DriverApplication.findOne({
      applicationNumber: applicationNumber.trim().toUpperCase(),
    });
  }

  async findMaxApplicationSequence() {
    const [latest] = await DriverApplication.aggregate<{ sequence: number }>([
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
    return DriverApplication.findOne({ email: email.trim().toLowerCase() }).sort({ createdAt: -1 });
  }

  findActiveByEmail(email: string) {
    return DriverApplication.findOne({
      email: email.trim().toLowerCase(),
      status: { $in: ["pending", "under_review", "changes_requested", "approved", "suspended"] },
    });
  }

  findByUserId(userId: string) {
    return DriverApplication.findOne({ userId }).sort({ updatedAt: -1 });
  }

  findWithPagination(query: GetDriverApplicationsQuery) {
    return new APIFeature(DriverApplication, query, {
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

  updateById(id: string, data: UpdateDriverApplicationData & Record<string, unknown>) {
    return DriverApplication.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async countByStatus() {
    const results = await DriverApplication.aggregate<{ _id: DriverApplicationStatus; count: number }>(
      [
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]
    );

    return results.map((item) => ({
      status: item._id,
      count: item.count,
    }));
  }
}

export default new DriverRepository();
