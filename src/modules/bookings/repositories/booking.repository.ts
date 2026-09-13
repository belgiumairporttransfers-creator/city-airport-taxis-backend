import { Types, type UpdateQuery } from "mongoose";
import { Booking } from "@/infrastructure/database/models/Booking";
import { AppError } from "@/shared/errors/AppError";
import APIFeature from "@/shared/utils/APIFeature";
import type {
  CreateBookingData,
  GetBookingsQuery,
  GetDriverBookingsQuery,
  IBooking,
} from "@/modules/bookings/types/booking.types";

const buildDriverBookingsFilter = (
  driverId: string,
  query: GetDriverBookingsQuery
): Record<string, unknown> => {
  const scope = query.scope ?? "accepted";
  const filter: Record<string, unknown> = {
    currentDriverId: new Types.ObjectId(driverId),
    assignmentStatus: { $in: ["accepted", "completed"] },
  };

  if (scope === "accepted") {
    filter.status = "accepted";
  } else if (scope === "completed") {
    filter.status = "complete";
  } else {
    filter.status = { $in: ["accepted", "complete"] };
  }

  return filter;
};

const buildAdminBookingsFilter = (query: GetBookingsQuery): Record<string, unknown> => {
  const filter: Record<string, unknown> = {};

  if (query.pickupDate) {
    filter["route.pickupDate"] = query.pickupDate;
  } else if (query.pickupDateFrom || query.pickupDateTo) {
    const range: { $gte?: string; $lte?: string } = {};
    if (query.pickupDateFrom) range.$gte = query.pickupDateFrom;
    if (query.pickupDateTo) range.$lte = query.pickupDateTo;
    filter["route.pickupDate"] = range;
  }

  if (query.paymentStatus) {
    filter["payment.paymentStatus"] = query.paymentStatus;
  }

  if (query.paymentMethod) {
    filter["payment.paymentMethod"] = query.paymentMethod;
  }

  if (query.vehicleCategory) {
    filter["vehicle.categoryId"] = new Types.ObjectId(query.vehicleCategory);
  }

  return filter;
};

class BookingRepository {
  async create(data: CreateBookingData): Promise<IBooking> {
    try {
      return await Booking.create(data);
    } catch (error) {
      const mongoError = error as { code?: number; name?: string; message?: string };

      if (mongoError.code === 11000) {
        throw new AppError("Unable to create booking. Please try again.", 409);
      }

      if (mongoError.name === "ValidationError") {
        throw new AppError(
          mongoError.message || "Booking validation failed",
          422
        );
      }

      throw new AppError(
        mongoError.message || "Unable to create booking. Please try again.",
        500
      );
    }
  }

  findById(id: string) {
    return Booking.findById(id);
  }

  claimConfirmedBookingForDriver(bookingId: string, driverId: string) {
    return Booking.findOneAndUpdate(
      {
        _id: bookingId,
        status: "confirmed",
        $and: [
          {
            $or: [{ currentDriverId: null }, { currentDriverId: { $exists: false } }],
          },
          {
            $or: [
              { currentAssignmentId: null },
              { currentAssignmentId: { $exists: false } },
            ],
          },
        ],
      },
      {
        $set: {
          currentDriverId: new Types.ObjectId(driverId),
        },
      },
      { new: true, runValidators: true }
    );
  }

  releaseDriverClaim(bookingId: string) {
    return Booking.findByIdAndUpdate(
      bookingId,
      {
        $unset: { currentDriverId: "" },
      },
      { new: true, runValidators: true }
    );
  }

  findDriverBookings(driverId: string, query: GetDriverBookingsQuery) {
    return new APIFeature(Booking, query, {
      initialFilter: buildDriverBookingsFilter(driverId, query),
      pagination: { defaultLimit: 20 },
      sort: {
        defaultSort: "-createdAt",
        allowedFields: [
          "createdAt",
          "updatedAt",
          "bookingNumber",
          "status",
          "route.pickupDate",
        ],
      },
      search: {
        searchFields: [
          "bookingNumber",
          "customer.firstName",
          "customer.lastName",
          "customer.email",
          "customer.phone",
          "route.pickupAddress",
          "route.dropoffAddress",
        ],
      },
      excludeFields: ["__v"],
      lean: true,
    }).execute();
  }

  findWithPagination(query: GetBookingsQuery) {
    const initialFilter = buildAdminBookingsFilter(query);

    return new APIFeature(Booking, query, {
      initialFilter: Object.keys(initialFilter).length > 0 ? initialFilter : undefined,
      pagination: { defaultLimit: 20 },
      sort: {
        defaultSort: "-createdAt",
        allowedFields: [
          "createdAt",
          "updatedAt",
          "bookingNumber",
          "status",
          "route.pickupDate",
          "payment.paymentStatus",
        ],
      },
      search: {
        searchFields: [
          "bookingNumber",
          "customer.firstName",
          "customer.lastName",
          "customer.email",
          "customer.phone",
          "route.pickupAddress",
          "route.dropoffAddress",
          "flight.flightNumber",
        ],
      },
      filterFields: ["status"],
      excludeFields: ["__v"],
      lean: true,
    }).execute();
  }

  updateById(id: string, data: UpdateQuery<IBooking>) {
    return Booking.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  deleteById(id: string) {
    return Booking.findByIdAndDelete(id);
  }

  deleteManyByIds(ids: string[]): Promise<{ deletedCount?: number }> {
    return Booking.deleteMany({ _id: { $in: ids } });
  }
}

export default new BookingRepository();
