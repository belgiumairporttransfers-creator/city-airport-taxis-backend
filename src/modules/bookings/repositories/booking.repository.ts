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

class BookingRepository {
  async create(data: CreateBookingData): Promise<IBooking> {
    try {
      return await Booking.create(data);
    } catch (error) {
      throw new AppError("Unable to create booking. Please try again.", 409);
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
    return new APIFeature(Booking, query, {
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
