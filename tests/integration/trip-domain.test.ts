import { describe, expect, it, beforeAll, afterAll, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "@/app";
import { Admin } from "@/infrastructure/database/models/Admin";
import { Assignment } from "@/infrastructure/database/models/Assignment";
import { Booking } from "@/infrastructure/database/models/Booking";
import { Driver } from "@/infrastructure/database/models/Driver";
import { Notification } from "@/infrastructure/database/models/Notification";
import { AuditLog } from "@/infrastructure/database/models/AuditLog";
import { Settings } from "@/infrastructure/database/models/Settings";
import emailService from "@/infrastructure/email/email.service";
import { DRIVER_DOCUMENT_FIELDS } from "@/modules/drivers/types/driver.types";
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
} from "../helpers/db";
import { getCsrfHeaderFromResponse, TEST_ADMIN } from "../helpers/auth";
import { createPaidMollieBooking } from "../helpers/mollie-booking";
import mollieClient from "@/modules/payments/utils/mollie.client";

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

  return { csrf: getCsrfHeaderFromResponse(loginResponse) };
};

const buildDocuments = () =>
  Object.fromEntries(
    DRIVER_DOCUMENT_FIELDS.map((field, index) => [
      field,
      `https://cdn.example.com/drivers/${field}-${index}.pdf`,
    ])
  );

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

const createCategoryAndPricing = async (
  adminAgent: request.SuperAgentTest,
  csrf: Record<string, string>
) => {
  const category = await adminAgent.post("/api/admin/vehicle-categories").set(csrf).send({
    name: "Trip Sedan",
    description: "Trip tests",
    passengerCapacity: 4,
    luggageCapacity: 2,
    sortOrder: 1,
    status: "active",
  });

  expect(category.status).toBe(200);

  await adminAgent
    .post(`/api/admin/vehicle-categories/${category.body.data._id}/pricing`)
    .set(csrf)
    .send({
      minDistance: 0,
      maxDistance: null,
      pricingType: "fixed",
      priceAmount: 85,
    });

  return category.body.data._id as string;
};

const createConfirmedBooking = async (
  publicAgent: request.SuperAgentTest,
  categoryId: string,
  email = "trip.booking@example.com",
  pickupDate = "2026-08-01"
) => {
  const providerId = `tr_trip_${email.replace(/[^a-z0-9]/gi, "_")}`;
  const { booking, bookingId, bookingNumber } = await createPaidMollieBooking(
    publicAgent,
    {
      category: "one-way",
      step1: {
        pickupAddress: "Schiphol Airport, Amsterdam",
        deliveryAddress: "Damrak 1, Amsterdam",
        pickupDate,
        pickupTime: "10:30",
        passengers: 2,
      },
      routeData: { distance: 50, durationMinutes: 45 },
      step2: {
        categoryId,
        category: { name: "Trip Sedan" },
        priceBreakdown: { totalPrice: 85 },
        passengers: 2,
        luggage: 2,
      },
      step3: {
        firstName: "Trip",
        lastName: "Customer",
        phone: "+31612345678",
        email,
        isAirportPickup: false,
        handLuggage: 0,
        smallCheckedCase: 0,
        largeCheckedCase: 0,
      },
      pricing: { total: 85, breakdown: { totalVehicleFare: 85, airportPickupPrice: 0 } },
    },
    providerId
  );

  return { bookingNumber, bookingId };
};

const createApprovedDriver = async (
  email: string,
  licensePlate: string,
  adminAgent: request.SuperAgentTest,
  csrf: Record<string, string>
) => {
  let approvedSetupToken = "";

  vi.spyOn(emailService, "sendDriverApplicationApprovedEmail").mockImplementation(
    async (_application, setupToken) => {
      approvedSetupToken = setupToken;
      return true;
    }
  );

  const agent = request.agent(app);
  const applyResponse = await agent.post("/api/drivers/apply").send({
    operatingCountry: "Netherlands",
    operatingCity: "Amsterdam",
    firstName: "Trip",
    lastName: "Driver",
    email,
    phone: "+31612345679",
    homeAddress: "Damrak 2",
    carType: "Mercedes E-Class",
    carColor: "Black",
    licensePlate,
    carYearModel: "2022",
    yearsOfExperience: 5,
    shiftType: "both",
    availableFrom: "06:00",
    availableTo: "22:00",
    documents: buildDocuments(),
  });

  const application = await Driver.findOne({
    applicationNumber: applyResponse.body.data.applicationNumber,
  });

  await adminAgent.post(`/api/admin/drivers/${application!._id.toString()}/start-review`).set(csrf);
  await adminAgent.post(`/api/admin/drivers/${application!._id.toString()}/approve`).set(csrf);

  await agent.post("/api/auth/set-password").send({
    token: approvedSetupToken,
    password: "DriverPass123!",
  });

  const driverAgent = request.agent(app);
  await driverAgent.post("/api/auth/login").send({
    email,
    password: "DriverPass123!",
  });

  return {
    driverAgent,
    driverId: application!._id.toString(),
  };
};

const acceptAssignmentForBooking = async (
  adminAgent: request.SuperAgentTest,
  csrf: Record<string, string>,
  bookingId: string,
  driverId: string,
  driverAgent: request.SuperAgentTest
) => {
  const created = await adminAgent.post("/api/admin/assignments").set(csrf).send({
    bookingId,
    driverId,
  });

  expect(created.status).toBe(201);

  const acceptResponse = await driverAgent.post(
    `/api/drivers/assignments/${created.body.data.id}/accept`
  );

  expect(acceptResponse.status).toBe(200);

  return created.body.data.id as string;
};

describe("Trip domain integration", () => {
  let publicAgent: request.SuperAgentTest;
  let adminAgent: request.SuperAgentTest;
  let csrf: Record<string, string>;
  let categoryId = "";

  beforeAll(async () => {
    process.env.MOLLIE_TEST_API_KEY = "test_mollie_key";
    process.env.REQUIRE_EMAIL_VERIFICATION = "false";
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
    categoryId = await createCategoryAndPricing(adminAgent, csrf);
    await seedSettings();

    vi.spyOn(emailService, "sendBookingConfirmedEmail").mockResolvedValue(true);
    vi.spyOn(emailService, "sendAdminBookingConfirmedEmail").mockResolvedValue(true);
    vi.spyOn(emailService, "sendBookingReceivedEmail").mockResolvedValue(true);
    vi.mocked(mollieClient.createPayment).mockReset();
    vi.mocked(mollieClient.getPayment).mockReset();
    vi.spyOn(emailService, "sendDriverAssignedEmail").mockResolvedValue(true);
    vi.spyOn(emailService, "sendAssignmentCancelledEmail").mockResolvedValue(true);
    vi.spyOn(emailService, "sendDriverApplicationReceivedEmail").mockResolvedValue(true);
    vi.spyOn(emailService, "sendTripCompletedEmail").mockResolvedValue(true);
  });

  it("executes full trip lifecycle with timeline, audit, notifications, and email", async () => {
    const { bookingNumber, bookingId } = await createConfirmedBooking(publicAgent, categoryId);
    const { driverId, driverAgent } = await createApprovedDriver(
      "trip.driver@example.com",
      "TR-001-GN",
      adminAgent,
      csrf
    );

    await acceptAssignmentForBooking(adminAgent, csrf, bookingId, driverId, driverAgent);

    const arrived = await driverAgent.post(`/api/drivers/trips/${bookingNumber}/arrived`);
    expect(arrived.status).toBe(200);
    expect(arrived.body.data.status).toBe("driver_arrived");

    const onboard = await driverAgent.post(
      `/api/drivers/trips/${bookingNumber}/passenger-onboard`
    );
    expect(onboard.status).toBe(200);
    expect(onboard.body.data.status).toBe("passenger_onboard");

    const started = await driverAgent.post(`/api/drivers/trips/${bookingNumber}/start`);
    expect(started.status).toBe(200);
    expect(started.body.data.status).toBe("trip_started");

    const completed = await driverAgent.post(`/api/drivers/trips/${bookingNumber}/complete`);
    expect(completed.status).toBe(200);
    expect(completed.body.data.status).toBe("completed");

    const booking = await Booking.findOne({ bookingNumber });
    expect(booking?.trip?.driverArrivedAt).toBeTruthy();
    expect(booking?.trip?.passengerBoardedAt).toBeTruthy();
    expect(booking?.trip?.actualPickupTime).toBeTruthy();
    expect(booking?.trip?.startedAt).toBeTruthy();
    expect(booking?.trip?.completedAt).toBeTruthy();
    expect(booking?.trip?.actualDropoffTime).toBeTruthy();
    expect(booking?.assignmentStatus).toBe("completed");

    const timelineEvents = booking?.timeline.map((entry) => entry.event) ?? [];
    expect(timelineEvents).toContain("DRIVER_ARRIVED");
    expect(timelineEvents).toContain("PASSENGER_ONBOARD");
    expect(timelineEvents).toContain("TRIP_STARTED");
    expect(timelineEvents).toContain("TRIP_COMPLETED");

    const auditEvents = await AuditLog.find({
      event: {
        $in: [
          "trip.driver_arrived",
          "trip.passenger_onboard",
          "trip.started",
          "trip.completed",
        ],
      },
    });
    expect(auditEvents.length).toBe(4);

    const notifications = await Notification.find({
      type: {
        $in: ["trip.driver_arrived", "trip.passenger_onboard", "trip.completed"],
      },
    });
    expect(notifications.length).toBeGreaterThanOrEqual(3);

    expect(emailService.sendTripCompletedEmail).toHaveBeenCalled();

    const assignment = await Assignment.findOne({ bookingId });
    expect(assignment?.status).toBe("completed");
    expect(assignment?.completedAt).toBeTruthy();
  });

  it("rejects invalid status transitions with 409", async () => {
    const { bookingNumber, bookingId } = await createConfirmedBooking(publicAgent, categoryId);
    const { driverId, driverAgent } = await createApprovedDriver(
      "invalid.trip@example.com",
      "TR-002-GN",
      adminAgent,
      csrf
    );

    await acceptAssignmentForBooking(adminAgent, csrf, bookingId, driverId, driverAgent);

    const skipArrived = await driverAgent.post(
      `/api/drivers/trips/${bookingNumber}/passenger-onboard`
    );
    expect(skipArrived.status).toBe(409);

    await driverAgent.post(`/api/drivers/trips/${bookingNumber}/arrived`);

    const skipStart = await driverAgent.post(`/api/drivers/trips/${bookingNumber}/start`);
    expect(skipStart.status).toBe(409);

    const skipComplete = await driverAgent.post(`/api/drivers/trips/${bookingNumber}/complete`);
    expect(skipComplete.status).toBe(409);
  });

  it("rejects unauthorized driver access", async () => {
    const { bookingNumber, bookingId } = await createConfirmedBooking(publicAgent, categoryId);
    const { driverId, driverAgent } = await createApprovedDriver(
      "owner.trip@example.com",
      "TR-003-GN",
      adminAgent,
      csrf
    );
    const { driverAgent: otherDriverAgent } = await createApprovedDriver(
      "other.trip@example.com",
      "TR-004-GN",
      adminAgent,
      csrf
    );

    await acceptAssignmentForBooking(adminAgent, csrf, bookingId, driverId, driverAgent);

    const response = await otherDriverAgent.post(`/api/drivers/trips/${bookingNumber}/arrived`);
    expect(response.status).toBe(403);
  });

  it("returns driver trip list buckets and trip detail", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { bookingNumber, bookingId } = await createConfirmedBooking(
      publicAgent,
      categoryId,
      "list.trip@example.com",
      today
    );
    const { driverId, driverAgent } = await createApprovedDriver(
      "list.driver@example.com",
      "TR-005-GN",
      adminAgent,
      csrf
    );

    await acceptAssignmentForBooking(adminAgent, csrf, bookingId, driverId, driverAgent);

    const listResponse = await driverAgent.get("/api/drivers/trips");
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data.today.length).toBeGreaterThan(0);
    expect(listResponse.body.data.upcoming).toEqual([]);
    expect(listResponse.body.data.active.length).toBeGreaterThan(0);

    const detailResponse = await driverAgent.get(`/api/drivers/trips/${bookingNumber}`);
    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body.data.booking.bookingNumber).toBe(bookingNumber);
    expect(detailResponse.body.data.customer.email).toBe("list.trip@example.com");
    expect(detailResponse.body.data.assignment).toBeTruthy();
    expect(detailResponse.body.data.timeline.length).toBeGreaterThan(0);
  });

  it("allows admin to list and view active trip detail", async () => {
    const { bookingNumber, bookingId } = await createConfirmedBooking(publicAgent, categoryId);
    const { driverId, driverAgent } = await createApprovedDriver(
      "admin.trip@example.com",
      "TR-006-GN",
      adminAgent,
      csrf
    );

    await acceptAssignmentForBooking(adminAgent, csrf, bookingId, driverId, driverAgent);
    await driverAgent.post(`/api/drivers/trips/${bookingNumber}/arrived`);

    const listResponse = await adminAgent.get("/api/admin/trips").set(csrf);
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data.items.length).toBeGreaterThan(0);

    const detailResponse = await adminAgent
      .get(`/api/admin/trips/${bookingNumber}`)
      .set(csrf);
    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body.data.booking.status).toBe("driver_arrived");
    expect(detailResponse.body.data.driver.id).toBe(driverId);
    expect(detailResponse.body.data.assignment).toBeTruthy();
    expect(detailResponse.body.data.timeline.some((e: { event: string }) => e.event === "DRIVER_ARRIVED")).toBe(
      true
    );
  });

  it("filters admin trips by status and driver", async () => {
    const { bookingNumber, bookingId } = await createConfirmedBooking(publicAgent, categoryId);
    const { driverId, driverAgent } = await createApprovedDriver(
      "filter.trip@example.com",
      "TR-007-GN",
      adminAgent,
      csrf
    );

    await acceptAssignmentForBooking(adminAgent, csrf, bookingId, driverId, driverAgent);
    await driverAgent.post(`/api/drivers/trips/${bookingNumber}/arrived`);

    const byStatus = await adminAgent
      .get("/api/admin/trips?status=driver_arrived")
      .set(csrf);
    expect(byStatus.status).toBe(200);
    expect(byStatus.body.data.items.every((item: { status: string }) => item.status === "driver_arrived")).toBe(
      true
    );

    const byDriver = await adminAgent.get(`/api/admin/trips?driver=${driverId}`).set(csrf);
    expect(byDriver.status).toBe(200);
    expect(byDriver.body.data.items.length).toBeGreaterThan(0);
  });
});
