import { Types } from "mongoose";
import { Booking } from "@/infrastructure/database/models/Booking";
import APIFeature from "@/shared/utils/APIFeature";
import type { GetAdminTripsQuery } from "../types/trip.types";
import { buildTripPhaseFilter } from "../utils/trip-phase";

const buildAdminInitialFilter = (query: GetAdminTripsQuery): Record<string, unknown> => {
  const filter: Record<string, unknown> = query.status
    ? buildTripPhaseFilter(query.status)
    : { status: { $in: ["accepted", "complete"] } };

  if (query.driver) {
    filter.currentDriverId = new Types.ObjectId(query.driver);
  }

  if (query.date) {
    filter["route.pickupDate"] = query.date;
  }

  return filter;
};

class TripRepository {
  findByBookingRef(bookingRef: string) {
    const trimmed = bookingRef.trim();

    if (Types.ObjectId.isValid(trimmed) && String(new Types.ObjectId(trimmed)) === trimmed) {
      return Booking.findById(trimmed);
    }

    return this.findByBookingNumber(trimmed);
  }

  findByBookingNumber(bookingNumber: string) {
    return Booking.findOne({
      bookingNumber: bookingNumber.trim().toUpperCase(),
    });
  }

  findDriverTrips(driverId: string) {
    return Booking.find({
      currentDriverId: new Types.ObjectId(driverId),
      status: {
        $in: ["accepted", "complete"],
      },
    })
      .sort({ "route.pickupDate": 1, "route.pickupTime": 1 })
      .lean();
  }

  findWithPagination(query: GetAdminTripsQuery) {
    return new APIFeature(Booking, query, {
      initialFilter: buildAdminInitialFilter(query),
      pagination: { defaultLimit: 20 },
      sort: {
        defaultSort: "-updatedAt",
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

  updateById(id: string, data: Record<string, unknown>) {
    return Booking.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  updateByBookingNumber(bookingNumber: string, data: Record<string, unknown>) {
    return Booking.findOneAndUpdate(
      { bookingNumber: bookingNumber.trim().toUpperCase() },
      data,
      { new: true, runValidators: true }
    );
  }
}

export default new TripRepository();
