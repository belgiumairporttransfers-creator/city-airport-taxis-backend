import { Types } from "mongoose";
import { Assignment } from "@/infrastructure/database/models/Assignment";
import { AppError } from "@/shared/errors/AppError";
import APIFeature from "@/shared/utils/APIFeature";
import type {
  GetAssignmentsQuery,
  GetDriverAssignmentsQuery,
} from "@/modules/assignments/types/assignment.types";
import { ACTIVE_ASSIGNMENT_STATUSES } from "@/modules/assignments/types/assignment.types";

const isDuplicateKeyError = (error: unknown): error is { code: number } =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code: number }).code === 11000;

const buildAdminInitialFilter = (query: GetAssignmentsQuery): Record<string, unknown> => {
  const filter: Record<string, unknown> = {};

  if (query.driver) {
    filter.driverId = new Types.ObjectId(query.driver);
  }

  if (query.booking) {
    if (Types.ObjectId.isValid(query.booking)) {
      filter.bookingId = new Types.ObjectId(query.booking);
    } else {
      filter.bookingNumber = query.booking.trim().toUpperCase();
    }
  }

  return filter;
};

const buildDriverScopeFilter = (
  query: GetDriverAssignmentsQuery
): Record<string, unknown> => {
  switch (query.scope) {
    case "today":
      return { bookingNumber: { $exists: true } }; // resolved in service via booking join
    case "upcoming":
      return { status: { $in: ["pending", "accepted"] } };
    case "awaiting":
      return { status: "pending" };
    case "accepted":
      return { status: "accepted" };
    case "completed":
      return { status: "completed" };
    case "cancelled":
      return { status: { $in: ["cancelled", "rejected", "expired"] } };
    default:
      return {};
  }
};

class AssignmentRepository {
  async create(data: Record<string, unknown>) {
    try {
      return await Assignment.create(data);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new AppError("Assignment number already exists", 409);
      }

      throw error;
    }
  }

  findById(id: string) {
    return Assignment.findById(id);
  }

  findByAssignmentNumber(assignmentNumber: string) {
    return Assignment.findOne({
      assignmentNumber: assignmentNumber.trim().toUpperCase(),
    });
  }

  findByBookingId(bookingId: string) {
    return Assignment.find({ bookingId }).sort({ createdAt: -1 });
  }

  findActiveByBookingId(bookingId: string) {
    return Assignment.findOne({
      bookingId,
      status: { $in: ACTIVE_ASSIGNMENT_STATUSES },
    });
  }

  findActiveByDriverId(driverId: string) {
    return Assignment.find({
      driverId,
      status: { $in: ACTIVE_ASSIGNMENT_STATUSES },
    });
  }

  async findMaxSequenceForDate(datePart: string) {
    const prefix = `ASG-${datePart}-`;
    const [latest] = await Assignment.aggregate<{ sequence: number }>([
      {
        $match: {
          assignmentNumber: { $regex: new RegExp(`^${prefix}\\d{6}$`, "i") },
        },
      },
      {
        $project: {
          sequence: {
            $toInt: {
              $substrCP: ["$assignmentNumber", prefix.length, 6],
            },
          },
        },
      },
      { $sort: { sequence: -1 } },
      { $limit: 1 },
    ]);

    return latest?.sequence ?? 0;
  }

  findWithPagination(query: GetAssignmentsQuery) {
    return new APIFeature(Assignment, query, {
      initialFilter: buildAdminInitialFilter(query),
      pagination: { defaultLimit: 20 },
      sort: {
        defaultSort: "-createdAt",
        allowedFields: ["createdAt", "updatedAt", "assignmentNumber", "status", "assignedAt"],
      },
      search: {
        searchFields: ["assignmentNumber", "bookingNumber"],
      },
      filterFields: ["status"],
      excludeFields: ["__v"],
      lean: true,
    }).execute();
  }

  findDriverAssignments(driverUserId: string, query: GetDriverAssignmentsQuery) {
    return new APIFeature(
      Assignment,
      { ...query, driverUserId },
      {
        initialFilter: {
          driverUserId: new Types.ObjectId(driverUserId),
          ...buildDriverScopeFilter(query),
        },
        pagination: { defaultLimit: 20 },
        sort: {
          defaultSort: "-assignedAt",
          allowedFields: ["createdAt", "assignedAt", "status", "assignmentNumber"],
        },
        filterFields: ["status"],
        excludeFields: ["__v"],
        lean: true,
      }
    ).execute();
  }

  findExpiredPending(before: Date) {
    return Assignment.find({
      status: "pending",
      expiresAt: { $lte: before },
    });
  }

  updateById(id: string, data: Record<string, unknown>) {
    return Assignment.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }
}

export default new AssignmentRepository();
