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
import { AppError } from "@/shared/errors/AppError";
import mollieClient from "@/modules/payments/utils/mollie.client";
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
} from "../helpers/db";
import {
  mockMollieCreatePayment,
  confirmMolliePayment,
} from "../helpers/mollie-booking";
import { getCsrfHeaderFromResponse, TEST_ADMIN } from "../helpers/auth";

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
  csrf: Record<string, string>,
  payload: Record<string, unknown> = {}
) => {
  const response = await agent
    .post("/api/admin/vehicle-categories")
    .set(csrf)
    .send({
      name: "Booking Sedan",
      description: "Standard booking category",
      passengerCapacity: 4,
      luggageCapacity: 2,
      sortOrder: 1,
      status: "active",
      ...payload,
    });

  expect(response.status).toBe(200);
  return response.body.data;
};

const createPricing = async (
  agent: request.SuperAgentTest,
  csrf: Record<string, string>,
  categoryId: string,
  priceAmount = 85
) => {
  const response = await agent
    .post(`/api/admin/vehicle-categories/${categoryId}/pricing`)
    .set(csrf)
    .send({
      minDistance: 0,
      maxDistance: null,
      pricingType: "fixed",
      priceAmount,
    });

  expect(response.status).toBe(200);
  return response.body.data;
};

const seedSettings = async (airportPickup = 15) => {
  await Settings.create({
    key: "global",
    maintenanceMode: false,
    comingSoonMode: false,
    paymentMode: "test",
    minBookingMinutes: 120,
    stopFee: 0,
    cardProcessingFee: 0,
    airportPickup,
    trainPickup: 0,
    meetAndGreet: 0,
    returnMeetAndGreet: 0,
    waitingTimePricePerMinute: 0,
    waitingTimePricePerHour: 0,
  });
};

const buildBookingPayload = (
  categoryId: string,
  overrides: Record<string, unknown> = {}
) => ({
  category: "one-way",
  step1: {
    pickupAddress: "Schiphol Airport, Amsterdam",
    deliveryAddress: "Damrak 1, Amsterdam",
    pickupDate: "2026-07-01",
    pickupTime: "10:30",
    passengers: 2,
  },
  routeData: {
    distance: 50,
    durationMinutes: 45,
    estTime: "11:15",
    isAirportSelected: true,
  },
  step2: {
    categoryId,
    category: {
      name: "Booking Sedan",
      vehicles: ["Toyota Camry"],
    },
    priceBreakdown: {
      totalPrice: 85,
    },
    passengers: 2,
    luggage: 2,
  },
  step3: {
    firstName: "Jane",
    lastName: "Passenger",
    phone: "+31612345678",
    email: "jane.passenger@example.com",
    isAirportPickup: false,
    handLuggage: 1,
    smallCheckedCase: 1,
    largeCheckedCase: 0,
  },
  pricing: {
    total: 85,
    breakdown: {
      totalVehicleFare: 85,
      airportPickupPrice: 0,
    },
  },
  ...overrides,
});

describe("Booking and payment integration", () => {
  let publicAgent: request.SuperAgentTest;
  let adminAgent: request.SuperAgentTest;
  let csrf: Record<string, string>;
  let categoryId = "";

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
    await createPricing(adminAgent, csrf, categoryId, 85);
    await seedSettings(15);

    vi.mocked(mollieClient.createPayment).mockReset();
    vi.mocked(mollieClient.getPayment).mockReset();

    vi.spyOn(emailService, "sendBookingConfirmedEmail").mockResolvedValue(true);
    vi.spyOn(emailService, "sendAdminBookingConfirmedEmail").mockResolvedValue(true);
    vi.spyOn(emailService, "sendBookingReceivedEmail").mockResolvedValue(true);
  });

  it("creates a pending mollie booking and returns checkout url", async () => {
    mockMollieCreatePayment("tr_pending_123", "https://checkout.mollie.com/test");

    const response = await publicAgent
      .post("/api/bookings")
      .send(buildBookingPayload(categoryId));

    expect(response.status).toBe(200);
    expect(response.body.data.bookingId).toMatch(/^[a-f0-9]{24}$/);
    expect(response.body.data.amount).toBe(85);
    expect(response.body.data.checkoutUrl).toBe("https://checkout.mollie.com/test");

    const booking = await Booking.findById(response.body.data.bookingId);
    expect(booking?.bookingNumber).toMatch(/^ODR-\d{6}$/);
    expect(booking?.status).toBe("pending");
    expect(booking?.pricing.total).toBe(85);
    expect(booking?.customer.email).toBe("jane.passenger@example.com");
    expect(booking?.timeline).toHaveLength(1);
    expect(booking?.timeline[0].event).toBe("BOOKING_CREATED");

    const payment = await Payment.findOne({ bookingId: booking?._id });
    expect(payment?.status).toBe("pending");
    expect(payment?.amount).toBe(85);
    expect(payment?.transactionId).toMatch(/^\d{10}$/);
    expect(payment?.providerPaymentId).toBe("tr_pending_123");

    expect(emailService.sendBookingConfirmedEmail).not.toHaveBeenCalled();

    const notifications = await Notification.find({ type: "booking.created" });
    expect(notifications.length).toBe(0);

    const audit = await AuditLog.findOne({ event: "booking.created" });
    expect(audit).toBeTruthy();
    const paymentAudit = await AuditLog.findOne({ event: "payment.created" });
    expect(paymentAudit).toBeTruthy();
  });

  it("allows multiple bookings for the same customer email", async () => {
    mockMollieCreatePayment("tr_multi_1");
    const first = await publicAgent.post("/api/bookings").send(buildBookingPayload(categoryId));
    mockMollieCreatePayment("tr_multi_2");
    const second = await publicAgent.post("/api/bookings").send(
      buildBookingPayload(categoryId, {
        step1: {
          pickupAddress: "Amsterdam Centraal",
          deliveryAddress: "Rotterdam Centraal",
          pickupDate: "2026-07-02",
          pickupTime: "08:00",
          passengers: 1,
        },
      })
    );

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.body.data.bookingId).not.toBe(second.body.data.bookingId);

    const bookings = await Booking.find({ "customer.email": "jane.passenger@example.com" });
    expect(bookings).toHaveLength(2);
  });

  it("rejects invalid category id", async () => {
    const response = await publicAgent.post("/api/bookings").send(
      buildBookingPayload("507f1f77bcf86cd799439011", {
        step2: {
          categoryId: "507f1f77bcf86cd799439011",
          category: { name: "Missing" },
          priceBreakdown: { totalPrice: 85 },
          passengers: 2,
          luggage: 2,
        },
      })
    );

    expect(response.status).toBe(404);
  });

  it("requires flight number when airport pickup is enabled", async () => {
    const response = await publicAgent.post("/api/bookings").send(
      buildBookingPayload(categoryId, {
        step3: {
          firstName: "Jane",
          lastName: "Passenger",
          phone: "+31612345678",
          email: "jane.passenger@example.com",
          isAirportPickup: true,
          handLuggage: 1,
          smallCheckedCase: 1,
          largeCheckedCase: 0,
        },
        pricing: {
          total: 100,
          breakdown: { totalVehicleFare: 85, airportPickupPrice: 15 },
        },
      })
    );

    expect(response.status).toBe(400);
  });

  it("creates airport pickup booking with provided pricing", async () => {
    mockMollieCreatePayment("tr_airport_123");

    const response = await publicAgent.post("/api/bookings").send(
      buildBookingPayload(categoryId, {
        step3: {
          firstName: "Jane",
          lastName: "Passenger",
          phone: "+31612345678",
          email: "jane.passenger@example.com",
          isAirportPickup: true,
          flightNumber: "KL1234",
          handLuggage: 1,
          smallCheckedCase: 1,
          largeCheckedCase: 0,
        },
        pricing: {
          total: 100,
          breakdown: { totalVehicleFare: 85, airportPickupPrice: 15 },
        },
      })
    );

    expect(response.status).toBe(200);
    expect(response.body.data.amount).toBe(100);

    const booking = await Booking.findById(response.body.data.bookingId);
    expect(booking?.pricing.airportPickupFee).toBe(15);
    expect(booking?.flight.flightNumber).toBe("KL1234");
  });

  it("generates unique booking numbers", async () => {
    mockMollieCreatePayment("tr_unique_1");
    const first = await publicAgent.post("/api/bookings").send(buildBookingPayload(categoryId));
    mockMollieCreatePayment("tr_unique_2");
    const second = await publicAgent.post("/api/bookings").send(
      buildBookingPayload(categoryId, {
        step3: {
          firstName: "John",
          lastName: "Doe",
          phone: "+31698765432",
          email: "john.doe@example.com",
          isAirportPickup: false,
          handLuggage: 0,
          smallCheckedCase: 0,
          largeCheckedCase: 0,
        },
      })
    );

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.body.data.bookingId).not.toBe(second.body.data.bookingId);
  });

  it("rolls back booking and payment when mollie create fails", async () => {
    vi.mocked(mollieClient.createPayment).mockRejectedValue(
      new AppError("Payment provider rejected the request", 502)
    );

    const response = await publicAgent
      .post("/api/bookings")
      .send(buildBookingPayload(categoryId));

    expect(response.status).toBe(502);

    const booking = await Booking.findOne({ "customer.email": "jane.passenger@example.com" });
    expect(booking?.status).toBe("cancelled");

    const payment = await Payment.findOne({ bookingId: booking?._id });
    expect(payment?.status).toBe("failed");

    const timelineEvents = booking?.timeline.map((entry) => entry.event) ?? [];
    expect(timelineEvents).toContain("BOOKING_CANCELLED");

    const failedAudit = await AuditLog.findOne({ event: "payment.failed" });
    expect(failedAudit).toBeTruthy();
  });

  it("handles mollie webhook paid status", async () => {
    mockMollieCreatePayment("tr_paid_123", "https://checkout.mollie.com/paid");

    const createResponse = await publicAgent.post("/api/bookings").send(
      buildBookingPayload(categoryId, {
        step3: {
          firstName: "Jane",
          lastName: "Passenger",
          phone: "+31612345678",
          email: "webhook.passenger@example.com",
          isAirportPickup: false,
          handLuggage: 1,
          smallCheckedCase: 1,
          largeCheckedCase: 0,
        },
      })
    );

    const payment = await Payment.findOne({ bookingId: createResponse.body.data.bookingId });
    await confirmMolliePayment(publicAgent, "tr_paid_123", payment!._id.toString());

    const booking = await Booking.findById(createResponse.body.data.bookingId);
    expect(booking?.status).toBe("confirmed");
    expect(booking?.payment.paymentStatus).toBe("paid");

    const timelineEvents = booking?.timeline.map((entry) => entry.event) ?? [];
    expect(timelineEvents).toContain("PAYMENT_RECEIVED");

    const refreshedPayment = await Payment.findById(payment!._id);
    expect(refreshedPayment?.status).toBe("paid");
    expect(refreshedPayment?.cardLastDigits).toBe("6787");

    expect(emailService.sendBookingConfirmedEmail).toHaveBeenCalled();
    const paidAudit = await AuditLog.findOne({ event: "payment.paid" });
    expect(paidAudit).toBeTruthy();

    const notifications = await Notification.find({ type: "booking.created" });
    expect(notifications.length).toBeGreaterThan(0);

    const listResponse = await adminAgent.get("/api/admin/notifications").set(csrf);
    expect(listResponse.status).toBe(200);
    expect(
      listResponse.body.data.items.some(
        (item: { type: string }) => item.type === "booking.created"
      )
    ).toBe(true);
  });

  it("ignores mollie webhook for unknown payment id", async () => {
    vi.mocked(mollieClient.getPayment).mockResolvedValue({
      id: "tr_unknown_payment",
      status: "open",
      amount: { value: "85.00", currency: "EUR" },
      description: "Booking",
    });

    const response = await publicAgent
      .post("/api/payments/mollie/webhook")
      .send({ id: "tr_unknown_payment" });

    expect(response.status).toBe(200);
    expect(response.body.data.received).toBe(true);
  });

  it("does not duplicate confirmation side effects on paid webhook retry", async () => {
    mockMollieCreatePayment("tr_paid_retry", "https://checkout.mollie.com/paid-retry");

    await publicAgent.post("/api/bookings").send(buildBookingPayload(categoryId));

    const payment = await Payment.findOne().sort({ createdAt: -1 });
    vi.mocked(emailService.sendBookingConfirmedEmail).mockClear();

    await confirmMolliePayment(publicAgent, "tr_paid_retry", payment!._id.toString());
    await confirmMolliePayment(publicAgent, "tr_paid_retry", payment!._id.toString());

    expect(emailService.sendBookingConfirmedEmail).toHaveBeenCalledTimes(1);
  });

  it("handles mollie webhook failed status", async () => {
    mockMollieCreatePayment("tr_failed_123", "https://checkout.mollie.com/failed");

    const createResponse = await publicAgent.post("/api/bookings").send(
      buildBookingPayload(categoryId, {
        step3: {
          firstName: "Jane",
          lastName: "Passenger",
          phone: "+31612345678",
          email: "failed.passenger@example.com",
          isAirportPickup: false,
          handLuggage: 1,
          smallCheckedCase: 1,
          largeCheckedCase: 0,
        },
      })
    );

    vi.mocked(mollieClient.getPayment).mockResolvedValue({
      id: "tr_failed_123",
      status: "failed",
      amount: { value: "85.00", currency: "EUR" },
      description: "Booking",
      metadata: {
        paymentId: (
          await Payment.findOne({ bookingId: createResponse.body.data.bookingId })
        )!._id.toString(),
      },
    });

    const webhookResponse = await publicAgent
      .post("/api/payments/mollie/webhook")
      .send({ id: "tr_failed_123" });

    expect(webhookResponse.status).toBe(200);

    const booking = await Booking.findById(createResponse.body.data.bookingId);
    expect(booking?.status).toBe("cancelled");

    const payment = await Payment.findOne({ bookingId: createResponse.body.data.bookingId });
    expect(payment?.status).toBe("failed");

    const failedAudit = await AuditLog.findOne({ event: "payment.failed" });
    expect(failedAudit).toBeTruthy();
  });

  it("returns public booking status by id", async () => {
    mockMollieCreatePayment("tr_status_lookup");

    const createResponse = await publicAgent
      .post("/api/bookings")
      .send(buildBookingPayload(categoryId));

    const booking = await Booking.findById(createResponse.body.data.bookingId);
    expect(booking).toBeTruthy();

    const statusResponse = await publicAgent.get(`/api/bookings/${booking!._id.toString()}`);

    expect(statusResponse.status).toBe(200);
    expect(statusResponse.body.data.bookingNumber).toBe(booking!.bookingNumber);
    expect(statusResponse.body.data._id).toBe(booking!._id.toString());
    expect(statusResponse.body.data.passengerDetails.email).toBe("jane.passenger@example.com");
  });

  it("lists bookings for admin", async () => {
    mockMollieCreatePayment("tr_admin_list");
    await publicAgent.post("/api/bookings").send(buildBookingPayload(categoryId));

    const response = await adminAgent.get("/api/admin/bookings").set(csrf);

    expect(response.status).toBe(200);
    expect(response.body.data.items.length).toBe(1);
    expect(response.body.data.items[0].bookingNumber).toMatch(/^ODR-\d{6}$/);
  });
});
