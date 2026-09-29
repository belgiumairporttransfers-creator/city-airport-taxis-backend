import { describe, it, expect, vi, beforeEach } from "vitest";
import { Types } from "mongoose";
import bookingService from "@/modules/bookings/services/booking.service";
import bookingRepository from "@/modules/bookings/repositories/booking.repository";
import vehicleCategoryRepository from "@/modules/vehicle-categories/repositories/vehicle-category.repository";
import paymentService from "@/modules/payments/services/payment.service";
import settingsService from "@/modules/settings/services/settings.service";
import { toPublicBookingStatusResponse } from "@/modules/bookings/dto";

import bookingConfirmationNotificationService from "@/modules/bookings/services/booking-confirmation-notification.service";
import bookingDriverNotificationService from "@/modules/bookings/services/booking-driver-notification.service";
import notificationService from "@/modules/notifications/services/notification.service";

describe("Two-trip Return Booking architecture", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(bookingConfirmationNotificationService, "notifyBookingConfirmed").mockResolvedValue(undefined as any);
    vi.spyOn(bookingDriverNotificationService, "scheduleNotifyAllDriversOfConfirmedBooking").mockResolvedValue(undefined as any);
    vi.spyOn(notificationService, "notifyAdmins").mockResolvedValue(undefined as any);
  });

  it("creates two linked booking records for return-trip bookings", async () => {
    const categoryId = new Types.ObjectId().toString();
    const outboundId = new Types.ObjectId();
    const returnId = new Types.ObjectId();

    vi.spyOn(vehicleCategoryRepository, "findById").mockResolvedValue({
      _id: new Types.ObjectId(categoryId),
      name: "Standard Van",
      status: "active",
      image: "https://example.com/van.png",
    } as any);

    vi.spyOn(settingsService, "getSettings").mockResolvedValue({
      paymentMode: "test",
    } as any);

    let createdBookings: any[] = [];
    vi.spyOn(bookingRepository, "create").mockImplementation(async (data: any) => {
      const isReturn = data.tripLeg === "return";
      const id = isReturn ? returnId : outboundId;
      const bookingNumber = isReturn ? "ODR-222222" : "ODR-111111";
      const doc = {
        ...data,
        _id: id,
        bookingNumber,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      createdBookings.push(doc);
      return doc as any;
    });

    vi.spyOn(bookingRepository, "updateById").mockImplementation(async (id: string, updates: any) => {
      const target = createdBookings.find((b) => b._id.toString() === id);
      if (target) {
        Object.assign(target, updates);
        return target;
      }
      return null;
    });

    vi.spyOn(paymentService, "createPayment").mockResolvedValue({
      _id: new Types.ObjectId(),
    } as any);

    const payload: any = {
      category: "return-trip",
      step1: {
        pickupAddress: "Brussels City Center",
        deliveryAddress: "Brussels Airport (BRU)",
        pickupDate: "2026-05-10",
        pickupTime: "10:00",
        returnDate: "2026-05-15",
        returnTime: "18:30",
        passengers: 2,
      },
      routeData: {
        distance: 25.5,
        durationMinutes: 30,
        estTime: "10:30",
        isAirportSelected: false,
      },
      step2: {
        categoryId,
        category: {
          name: "Standard Van",
          image: "https://example.com/van.png",
        },
        priceBreakdown: {
          totalPrice: 120,
        },
        passengers: 2,
        luggage: 2,
      },
      step3: {
        firstName: "Alice",
        lastName: "Smith",
        phone: "+32477123456",
        email: "alice@example.com",
        isAirportPickup: false,
        handLuggage: 1,
        smallCheckedCase: 1,
        largeCheckedCase: 1,
        paymentMethod: "pay_onboard",
      },
      pricing: {
        total: 120,
        breakdown: {
          totalVehicleFare: 120,
          airportPickupPrice: 0,
        },
      },
    };

    const result = await bookingService.createBooking(payload);

    expect(result.booking).toBeDefined();
    expect(result.booking.bookingNumber).toBe("ODR-111111");
    expect(createdBookings).toHaveLength(2);

    const outbound = createdBookings[0];
    const returnTrip = createdBookings[1];

    // Outbound checks
    expect(outbound.tripLeg).toBe("outbound");
    expect(outbound.route.pickupAddress).toBe("Brussels City Center");
    expect(outbound.route.dropoffAddress).toBe("Brussels Airport (BRU)");
    expect(outbound.route.pickupDate).toBe("2026-05-10");
    expect(outbound.route.pickupTime).toBe("10:00");
    expect(outbound.pricing.total).toBe(60);
    expect(outbound.relatedBookingId.toString()).toBe(returnId.toString());
    expect(outbound.relatedBookingNumber).toBe("ODR-222222");

    // Return checks (swapped addresses and return date/time)
    expect(returnTrip.tripLeg).toBe("return");
    expect(returnTrip.route.pickupAddress).toBe("Brussels Airport (BRU)");
    expect(returnTrip.route.dropoffAddress).toBe("Brussels City Center");
    expect(returnTrip.route.pickupDate).toBe("2026-05-15");
    expect(returnTrip.route.pickupTime).toBe("18:30");
    expect(returnTrip.pricing.total).toBe(60);
    expect(returnTrip.relatedBookingId.toString()).toBe(outboundId.toString());
    expect(returnTrip.relatedBookingNumber).toBe("ODR-111111");

    // Total of both trips must equal payload pricing
    expect(outbound.pricing.total + returnTrip.pricing.total).toBe(120);

    // Public DTO verification
    const publicResponse = toPublicBookingStatusResponse(outbound);
    expect(publicResponse.bookingNumber).toBe("ODR-111111");
    expect(publicResponse.relatedBookingId).toBe(returnId.toString());
    expect(publicResponse.relatedBookingNumber).toBe("ODR-222222");
    expect(publicResponse.tripLeg).toBe("outbound");
  });
});
