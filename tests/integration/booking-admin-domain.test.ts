import { describe, expect, it, beforeAll, afterAll, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "@/app";
import { Admin } from "@/infrastructure/database/models/Admin";
import { Booking } from "@/infrastructure/database/models/Booking";
import { Payment } from "@/infrastructure/database/models/Payment";
import { Notification } from "@/infrastructure/database/models/Notification";
import { AuditLog } from "@/infrastructure/database/models/AuditLog";
import { Settings } from "@/infrastructure/database/models/Settings";
import emailService from "@/infrastructure/email/email.service";
import mollieClient from "@/modules/payments/utils/mollie.client";
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
} from "../helpers/db";
import { getCsrfHeaderFromResponse, TEST_ADMIN } from "../helpers/auth";
import {
  createPaidMollieBooking,
  mockMollieCreatePayment,
} from "../helpers/mollie-booking";

vi.mock("@/modules/payments/utils/mollie.client", async () => {
  const actual = await vi.importActual<typeof import("@/modules/payments/utils/mollie.client")>(
    "@/modules/payments/utils/mollie.client"
  );

  return {
    ...actual,
    default: {
      createPayment: vi.fn(),
      getPayment: vi.fn(),
    },
  };
});

const loginAdmin = async (agent: request.SuperAgentTest) => {
  const loginResponse = await agent.post("/api/admin/auth/login").send({
    email: TEST_ADMIN.email,
    password: TEST_ADMIN.password,
  });

  expect(loginResponse.status).toBe(200);

  return {
    csrf: getCsrfHeaderFromResponse(loginResponse),
  };
};

const createCategory = async (
  agent: request.SuperAgentTest,
  csrf: Record<string, string>
) => {
  const response = await agent.post("/api/admin/vehicle-categories").set(csrf).send({
    name: "Admin Booking Sedan",
    description: "Admin booking tests",
    passengerCapacity: 4,
    luggageCapacity: 2,
    sortOrder: 1,
    status: "active",
  });

  expect(response.status).toBe(200);
  return response.body.data;
};

const createPricing = async (
  agent: request.SuperAgentTest,
  csrf: Record<string, string>,
  categoryId: string
) => {
  const response = await agent
    .post(`/api/admin/vehicle-categories/${categoryId}/pricing`)
    .set(csrf)
    .send({
      minDistance: 0,
      maxDistance: null,
      pricingType: "fixed",
      priceAmount: 85,
    });

  expect(response.status).toBe(200);
};

const seedSettings = async () => {
  await Settings.create({
    key: "global",
    maintenanceMode: false,
    comingSoonMode: false,
    paymentMode: "test",
    minBookingMinutes: 120,
    stopFee: 0,
    cardProcessingFee: 0,
    airportPickup: 15,
    trainPickup: 0,
    meetAndGreet: 0,
    returnMeetAndGreet: 0,
    waitingTimePricePerMinute: 0,
    waitingTimePricePerHour: 0,
  });
};

const buildBookingPayload = (categoryId: string, overrides: Record<string, unknown> = {}) => ({
  category: "one-way",
  step1: {
    pickupAddress: "Schiphol Airport, Amsterdam",
    deliveryAddress: "Damrak 1, Amsterdam",
    pickupDate: "2026-07-15",
    pickupTime: "10:30",
    passengers: 2,
  },
  routeData: {
    distance: 50,
    durationMinutes: 45,
    estTime: "11:15",
    isAirportSelected: false,
  },
  step2: {
    categoryId,
    category: { name: "Admin Booking Sedan", vehicles: ["Toyota Camry"] },
    priceBreakdown: { totalPrice: 85 },
    passengers: 2,
    luggage: 2,
  },
  step3: {
    firstName: "Admin",
    lastName: "Tester",
    phone: "+31612345678",
    email: "admin.booking.test@example.com",
    isAirportPickup: false,
    handLuggage: 1,
    smallCheckedCase: 0,
    largeCheckedCase: 0,
  },
  pricing: {
    total: 85,
    breakdown: { totalVehicleFare: 85, airportPickupPrice: 0 },
  },
  ...overrides,
});

describe("Admin booking management integration", () => {
  let publicAgent: request.SuperAgentTest;
  let adminAgent: request.SuperAgentTest;
  let csrf: Record<string, string>;
  let categoryId = "";

  let confirmedBookingCounter = 0;

  const createConfirmedBooking = async () => {
    confirmedBookingCounter += 1;
    const providerId = `tr_admin_confirmed_${confirmedBookingCounter}`;
    const { booking } = await createPaidMollieBooking(
      publicAgent,
      buildBookingPayload(categoryId),
      providerId
    );

    return {
      id: booking._id.toString(),
      bookingNumber: booking.bookingNumber,
    };
  };

  const createPendingPaymentBooking = async () => {
    mockMollieCreatePayment("tr_admin_pending", "https://checkout.mollie.com/admin");

    const response = await publicAgent.post("/api/bookings").send(
      buildBookingPayload(categoryId, {
        step3: {
          firstName: "Pending",
          lastName: "Payment",
          phone: "+31612345678",
          email: "pending.payment@example.com",
          isAirportPickup: false,
          handLuggage: 0,
          smallCheckedCase: 0,
          largeCheckedCase: 0,
        },
      })
    );

    expect(response.status).toBe(200);
    const booking = (await Booking.findById(response.body.data.bookingId))!;
    return {
      id: booking._id.toString(),
      bookingNumber: booking.bookingNumber,
    };
  };

  beforeAll(async () => {
    process.env.MOLLIE_TEST_API_KEY = "test_mollie_key";
    await connectTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    await Admin.create(TEST_ADMIN);
    publicAgent = request.agent(app);
    adminAgent = request.agent(app);
    ({ csrf } = await loginAdmin(adminAgent));

    const category = await createCategory(adminAgent, csrf);
    categoryId = category._id;
    await createPricing(adminAgent, csrf, categoryId);
    await seedSettings();

    vi.spyOn(emailService, "sendBookingConfirmedEmail").mockResolvedValue(true);
    vi.spyOn(emailService, "sendAdminBookingConfirmedEmail").mockResolvedValue(true);
    vi.spyOn(emailService, "sendBookingReceivedEmail").mockResolvedValue(true);
    vi.spyOn(emailService, "sendBookingCancelledEmail").mockResolvedValue(true);
  });

  it("lists bookings with pagination meta", async () => {
    await createConfirmedBooking();
    await createConfirmedBooking();

    const response = await adminAgent.get("/api/admin/bookings?page=1&limit=1").set(csrf);

    expect(response.status).toBe(200);
    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.meta.total).toBe(2);
    expect(response.body.data.meta.page).toBe(1);
    expect(response.body.data.items[0].bookingNumber).toMatch(/^ODR-\d{6}$/);
    expect(response.body.data.items[0].id).toBeDefined();
    expect(response.body.data.items[0].adminNotes).toEqual([]);
  });

  it("filters bookings by status and payment method", async () => {
    await createConfirmedBooking();
    await createPendingPaymentBooking();

    const confirmed = await adminAgent
      .get("/api/admin/bookings?status=confirmed&paymentMethod=mollie")
      .set(csrf);

    expect(confirmed.status).toBe(200);
    expect(confirmed.body.data.items).toHaveLength(1);
    expect(confirmed.body.data.items[0].status).toBe("confirmed");
    expect(confirmed.body.data.items[0].payment.paymentMethod).toBe("mollie");

    const pending = await adminAgent
      .get("/api/admin/bookings?status=pending&paymentMethod=mollie")
      .set(csrf);

    expect(pending.status).toBe(200);
    expect(pending.body.data.items).toHaveLength(1);
    expect(pending.body.data.items[0].status).toBe("pending");
  });

  it("searches bookings by customer email", async () => {
    await createConfirmedBooking();

    const response = await adminAgent
      .get("/api/admin/bookings?search=admin.booking.test@example.com")
      .set(csrf);

    expect(response.status).toBe(200);
    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.items[0].customer.email).toBe("admin.booking.test@example.com");
  });

  it("returns complete booking detail with payment record", async () => {
    const booking = await createConfirmedBooking();

    const response = await adminAgent.get(`/api/admin/bookings/${booking.id}`).set(csrf);

    expect(response.status).toBe(200);
    expect(response.body.data.bookingNumber).toBe(booking.bookingNumber);
    expect(response.body.data.customer.firstName).toBe("Admin");
    expect(response.body.data.route.pickupAddress).toContain("Schiphol");
    expect(response.body.data.vehicle.categoryName).toBe("Admin Booking Sedan");
    expect(response.body.data.pricing.total).toBe(85);
    expect(response.body.data.paymentRecord?.amount).toBe(85);
    expect(response.body.data.timeline.length).toBeGreaterThan(0);
  });

  it("updates editable booking fields and appends timeline", async () => {
    const booking = await createConfirmedBooking();

    const response = await adminAgent
      .patch(`/api/admin/bookings/${booking.id}`)
      .set(csrf)
      .send({
        pickupDate: "2026-07-20",
        pickupTime: "14:00",
        notes: "Updated customer note",
        passengers: 3,
        luggage: 3,
        adminNote: "Internal follow-up required",
      });

    expect(response.status).toBe(200);
    expect(response.body.data.route.pickupDate).toBe("2026-07-20");
    expect(response.body.data.route.pickupTime).toBe("14:00");
    expect(response.body.data.notes).toBe("Updated customer note");
    expect(response.body.data.vehicle.passengers).toBe(3);
    expect(response.body.data.adminNotes).toHaveLength(1);
    expect(response.body.data.adminNotes[0].message).toBe("Internal follow-up required");

    const timelineEvents = response.body.data.timeline.map((entry: { event: string }) => entry.event);
    expect(timelineEvents).toContain("BOOKING_UPDATED");

    const audit = await AuditLog.findOne({
      event: "booking.updated",
      entityType: "booking",
    });
    expect(audit).toBeTruthy();
  });

  it("confirms a pending payment booking", async () => {
    const booking = await createPendingPaymentBooking();

    const response = await adminAgent
      .post(`/api/admin/bookings/${booking.id}/confirm`)
      .set(csrf);

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("confirmed");
    expect(response.body.data.payment.paymentStatus).toBe("paid");
    expect(emailService.sendBookingConfirmedEmail).toHaveBeenCalled();

    const timelineEvents = response.body.data.timeline.map((entry: { event: string }) => entry.event);
    expect(timelineEvents).toContain("BOOKING_CONFIRMED");

    const audit = await AuditLog.findOne({ event: "booking.confirmed" });
    expect(audit).toBeTruthy();
  });

  it("rejects invalid confirm transition", async () => {
    const booking = await createConfirmedBooking();

    const response = await adminAgent
      .post(`/api/admin/bookings/${booking.id}/confirm`)
      .set(csrf);

    expect(response.status).toBe(400);
  });

  it("cancels a confirmed booking and notifies admins", async () => {
    const booking = await createConfirmedBooking();

    const response = await adminAgent
      .post(`/api/admin/bookings/${booking.id}/cancel`)
      .set(csrf)
      .send({ reason: "Customer request" });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("cancelled");
    expect(emailService.sendBookingCancelledEmail).toHaveBeenCalled();

    const notifications = await Notification.find({ type: "booking.cancelled" });
    expect(notifications.length).toBeGreaterThan(0);

    const audit = await AuditLog.findOne({ event: "booking.cancelled" });
    expect(audit).toBeTruthy();
  });

  it("rejects cancelling a terminal booking", async () => {
    const booking = await createConfirmedBooking();

    await adminAgent.post(`/api/admin/bookings/${booking.id}/cancel`).set(csrf);

    const response = await adminAgent
      .post(`/api/admin/bookings/${booking.id}/cancel`)
      .set(csrf);

    expect(response.status).toBe(400);
  });

  it("marks a confirmed booking as no-show", async () => {
    const booking = await createConfirmedBooking();

    const response = await adminAgent
      .post(`/api/admin/bookings/${booking.id}/no-show`)
      .set(csrf);

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("cancelled");

    const timelineEvents = response.body.data.timeline.map((entry: { event: string }) => entry.event);
    expect(timelineEvents).toContain("BOOKING_MARKED_NO_SHOW");

    const audit = await AuditLog.findOne({ event: "booking.no_show" });
    expect(audit).toBeTruthy();
  });

  it("rejects no-show from pending payment", async () => {
    const booking = await createPendingPaymentBooking();

    const response = await adminAgent
      .post(`/api/admin/bookings/${booking.id}/no-show`)
      .set(csrf);

    expect(response.status).toBe(400);
  });

  it("filters bookings by pickup date", async () => {
    await createConfirmedBooking();

    const response = await adminAgent
      .get("/api/admin/bookings?pickupDate=2026-07-15")
      .set(csrf);

    expect(response.status).toBe(200);
    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.items[0].route.pickupDate).toBe("2026-07-15");
  });

  it("filters bookings by vehicle category", async () => {
    await createConfirmedBooking();

    const response = await adminAgent
      .get(`/api/admin/bookings?vehicleCategory=${categoryId}`)
      .set(csrf);

    expect(response.status).toBe(200);
    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.items[0].vehicle.categoryId).toBe(categoryId);
  });

  it("deletes a booking and its payment history", async () => {
    const booking = await createConfirmedBooking();
    const paymentsBefore = await Payment.countDocuments({ bookingId: booking.id });
    expect(paymentsBefore).toBeGreaterThan(0);

    const response = await adminAgent
      .delete(`/api/admin/bookings/${booking.id}`)
      .set(csrf);

    expect(response.status).toBe(200);

    const deletedBooking = await Booking.findById(booking.id);
    const paymentsAfter = await Payment.countDocuments({ bookingId: booking.id });

    expect(deletedBooking).toBeNull();
    expect(paymentsAfter).toBe(0);
  });

  it("bulk deletes bookings and cascades payment removal", async () => {
    const first = await createConfirmedBooking();
    const second = await createConfirmedBooking();

    const response = await adminAgent
      .delete("/api/admin/bookings/bulk")
      .set(csrf)
      .send({ ids: [first.id, second.id] });

    expect(response.status).toBe(200);
    expect(response.body.data.deletedCount).toBe(2);

    const remainingBookings = await Booking.countDocuments({
      _id: { $in: [first.id, second.id] },
    });
    const remainingPayments = await Payment.countDocuments({
      bookingId: { $in: [first.id, second.id] },
    });

    expect(remainingBookings).toBe(0);
    expect(remainingPayments).toBe(0);
  });
});
