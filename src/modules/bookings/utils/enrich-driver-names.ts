import { Types } from "mongoose";
import { Driver } from "@/infrastructure/database/models/Driver";
import type { BookingResponse } from "@/modules/bookings/dto/index";

const driverNameFrom = (driver?: {
  firstName?: string;
  lastName?: string;
} | null) => {
  if (!driver) return undefined;
  const name = `${driver.firstName ?? ""} ${driver.lastName ?? ""}`.trim();
  return name || undefined;
};

export const withDriverNames = async (
  bookings: BookingResponse[]
): Promise<BookingResponse[]> => {
  const missingIds = [
    ...new Set(
      bookings
        .filter(
          (booking) =>
            booking.driver.driverId &&
            !booking.driver.firstName &&
            !booking.driver.name
        )
        .map((booking) => booking.driver.driverId as string)
    ),
  ];

  if (!missingIds.length) {
    return bookings.map((booking) => {
      const name =
        booking.driver.name ||
        driverNameFrom(booking.driver) ||
        undefined;
      if (!name && !booking.driver.firstName) return booking;
      return {
        ...booking,
        driver: {
          ...booking.driver,
          name,
        },
      };
    });
  }

  const drivers = await Driver.find({
    _id: { $in: missingIds.map((id) => new Types.ObjectId(id)) },
  })
    .select("firstName lastName")
    .lean();

  const byId = new Map(
    drivers.map((driver) => [
      String(driver._id),
      {
        firstName: driver.firstName as string,
        lastName: driver.lastName as string,
        name: driverNameFrom(driver),
      },
    ])
  );

  return bookings.map((booking) => {
    const existingName =
      booking.driver.name || driverNameFrom(booking.driver) || undefined;
    if (existingName) {
      return {
        ...booking,
        driver: {
          ...booking.driver,
          name: existingName,
        },
      };
    }

    const resolved = booking.driver.driverId
      ? byId.get(booking.driver.driverId)
      : undefined;

    if (!resolved) return booking;

    return {
      ...booking,
      driver: {
        ...booking.driver,
        firstName: resolved.firstName,
        lastName: resolved.lastName,
        name: resolved.name,
      },
    };
  });
};

export const withDriverName = async (
  booking: BookingResponse
): Promise<BookingResponse> => {
  const [enriched] = await withDriverNames([booking]);
  return enriched;
};
