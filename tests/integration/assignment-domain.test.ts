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
import assignmentService from "@/modules/assignments/services/assignment.service";
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
    name: "Assignment Sedan",
    description: "Assignment tests",
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
  email = "assignment.booking@example.com"
) => {
  const providerId = `tr_assign_${email.replace(/[^a-z0-9]/gi, "_")}`;
  const { bookingId, bookingNumber } = await createPaidMollieBooking(
    publicAgent,
    {
      category: "one-way",
      step1: {
        pickupAddress: "Schiphol Airport, Amsterdam",
        deliveryAddress: "Damrak 1, Amsterdam",
        pickupDate: "2026-08-01",
        pickupTime: "10:30",
        passengers: 2,
      },
      routeData: { distance: 50, durationMinutes: 45 },
      step2: {
        categoryId,
        category: { name: "Assignment Sedan" },
        priceBreakdown: { totalPrice: 85 },
        passengers: 2,
        luggage: 2,
      },
      step3: {
        firstName: "Assign",
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
    firstName: "Assign",
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

describe("Assignment domain integration", () => {
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
    vi.spyOn(emailService, "sendDriverNewBookingEmail").mockResolvedValue(true);
    vi.spyOn(emailService, "sendAssignmentCancelledEmail").mockResolvedValue(true);
    vi.spyOn(emailService, "sendDriverApplicationReceivedEmail").mockResolvedValue(true);
  });

  it("creates an assignment for a confirmed booking", async () => {
    const { bookingId } = await createConfirmedBooking(publicAgent, categoryId);
    const { driverId } = await createApprovedDriver(
      "driver.one@example.com",
      "AS-001-GN",
      adminAgent,
      csrf
    );

    const response = await adminAgent.post("/api/admin/assignments").set(csrf).send({
      bookingId,
      driverId,
      adminNotes: "Priority pickup",
    });

    expect(response.status).toBe(201);
    expect(response.body.data.assignmentNumber).toMatch(/^ASG-\d{8}-\d{6}$/);
    expect(response.body.data.status).toBe("pending");

    const booking = await Booking.findById(bookingId);
    expect(booking?.status).toBe("confirmed");
    expect(booking?.assignmentStatus).toBe("pending");
    expect(booking?.currentDriverId?.toString()).toBe(driverId);

    const audit = await AuditLog.findOne({ event: "assignment.created" });
    expect(audit).toBeTruthy();
    expect(emailService.sendDriverAssignedEmail).toHaveBeenCalled();
  });

  it("rejects assignment for non-confirmed booking", async () => {
    const { driverId } = await createApprovedDriver(
      "driver.two@example.com",
      "AS-002-GN",
      adminAgent,
      csrf
    );

    const response = await adminAgent.post("/api/admin/assignments").set(csrf).send({
      bookingId: "507f1f77bcf86cd799439011",
      driverId,
    });

    expect(response.status).toBe(404);
  });

  it("rejects assignment for unapproved driver", async () => {
    const { bookingId } = await createConfirmedBooking(publicAgent, categoryId);

    const applyResponse = await publicAgent.post("/api/drivers/apply").send({
      operatingCountry: "Netherlands",
      operatingCity: "Amsterdam",
      firstName: "Pending",
      lastName: "Driver",
      email: "pending.driver@example.com",
      phone: "+31612345680",
      homeAddress: "Damrak 3",
      carType: "Toyota",
      carColor: "White",
      licensePlate: "PD-001-GN",
      carYearModel: "2020",
      yearsOfExperience: 2,
      shiftType: "both",
      availableFrom: "06:00",
      availableTo: "22:00",
      documents: buildDocuments(),
    });

    const pendingDriver = await Driver.findOne({
      applicationNumber: applyResponse.body.data.applicationNumber,
    });

    const response = await adminAgent.post("/api/admin/assignments").set(csrf).send({
      bookingId,
      driverId: pendingDriver!._id.toString(),
    });

    expect(response.status).toBe(400);
  });

  it("rejects busy driver on same pickup date", async () => {
    const bookingA = await createConfirmedBooking(publicAgent, categoryId, "busy.a@example.com");
    const bookingB = await createConfirmedBooking(publicAgent, categoryId, "busy.b@example.com");
    const { driverId } = await createApprovedDriver(
      "busy.driver@example.com",
      "BS-001-GN",
      adminAgent,
      csrf
    );

    const first = await adminAgent.post("/api/admin/assignments").set(csrf).send({
      bookingId: bookingA.bookingId,
      driverId,
    });
    expect(first.status).toBe(201);

    const second = await adminAgent.post("/api/admin/assignments").set(csrf).send({
      bookingId: bookingB.bookingId,
      driverId,
    });
    expect(second.status).toBe(409);
  });

  it("allows driver to accept assignment", async () => {
    const { bookingId } = await createConfirmedBooking(publicAgent, categoryId);
    const { driverId, driverAgent } = await createApprovedDriver(
      "accept.driver@example.com",
      "AC-001-GN",
      adminAgent,
      csrf
    );

    const created = await adminAgent.post("/api/admin/assignments").set(csrf).send({
      bookingId,
      driverId,
    });

    const assignmentId = created.body.data.id;
    const response = await driverAgent.post(`/api/drivers/assignments/${assignmentId}/accept`);

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("accepted");

    const booking = await Booking.findById(bookingId);
    expect(booking?.status).toBe("accepted");
    expect(booking?.assignmentStatus).toBe("accepted");

    const audit = await AuditLog.findOne({ event: "assignment.accepted" });
    expect(audit).toBeTruthy();

    const notifications = await Notification.find({ type: "assignment.accepted" });
    expect(notifications.length).toBeGreaterThan(0);
  });

  it("allows driver to reject assignment", async () => {
    const { bookingId } = await createConfirmedBooking(publicAgent, categoryId);
    const { driverId, driverAgent } = await createApprovedDriver(
      "reject.driver@example.com",
      "RJ-001-GN",
      adminAgent,
      csrf
    );

    const created = await adminAgent.post("/api/admin/assignments").set(csrf).send({
      bookingId,
      driverId,
    });

    const response = await driverAgent
      .post(`/api/drivers/assignments/${created.body.data.id}/reject`)
      .send({ reason: "Not available" });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("rejected");

    const booking = await Booking.findById(bookingId);
    expect(booking?.status).toBe("confirmed");
    expect(booking?.currentAssignmentId).toBeFalsy();

    const audit = await AuditLog.findOne({ event: "assignment.rejected" });
    expect(audit).toBeTruthy();
  });

  it("blocks driver from accessing another drivers assignment", async () => {
    const { bookingId } = await createConfirmedBooking(publicAgent, categoryId);
    const { driverId } = await createApprovedDriver(
      "owner.driver@example.com",
      "OW-001-GN",
      adminAgent,
      csrf
    );
    const { driverAgent: otherDriverAgent } = await createApprovedDriver(
      "other.driver@example.com",
      "OT-001-GN",
      adminAgent,
      csrf
    );

    const created = await adminAgent.post("/api/admin/assignments").set(csrf).send({
      bookingId,
      driverId,
    });

    const response = await otherDriverAgent.get(
      `/api/drivers/assignments/${created.body.data.id}`
    );

    expect(response.status).toBe(403);
  });

  it("cancels assignment and restores booking to confirmed", async () => {
    const { bookingId } = await createConfirmedBooking(publicAgent, categoryId);
    const { driverId } = await createApprovedDriver(
      "cancel.driver@example.com",
      "CN-001-GN",
      adminAgent,
      csrf
    );

    const created = await adminAgent.post("/api/admin/assignments").set(csrf).send({
      bookingId,
      driverId,
    });

    const response = await adminAgent
      .post(`/api/admin/assignments/${created.body.data.id}/cancel`)
      .set(csrf);

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("cancelled");

    const booking = await Booking.findById(bookingId);
    expect(booking?.status).toBe("confirmed");

    const audit = await AuditLog.findOne({ event: "assignment.cancelled" });
    expect(audit).toBeTruthy();
  });

  it("reassigns driver and preserves history", async () => {
    const { bookingId, bookingNumber } = await createConfirmedBooking(publicAgent, categoryId);
    const driverOne = await createApprovedDriver(
      "reassign.one@example.com",
      "RA-001-GN",
      adminAgent,
      csrf
    );
    const driverTwo = await createApprovedDriver(
      "reassign.two@example.com",
      "RA-002-GN",
      adminAgent,
      csrf
    );

    const first = await adminAgent.post("/api/admin/assignments").set(csrf).send({
      bookingId,
      driverId: driverOne.driverId,
    });

    const second = await adminAgent
      .post(`/api/admin/assignments/${first.body.data.id}/reassign`)
      .set(csrf)
      .send({
        bookingId,
        driverId: driverTwo.driverId,
      });

    expect(second.status).toBe(201);

    const history = await Assignment.find({ bookingNumber }).sort({ createdAt: 1 });
    expect(history).toHaveLength(2);
    expect(history[0].status).toBe("cancelled");
    expect(history[1].status).toBe("pending");

    const audit = await AuditLog.findOne({ event: "assignment.reassigned" });
    expect(audit).toBeTruthy();
  });

  it("expires pending assignments after timeout", async () => {
    const { bookingId } = await createConfirmedBooking(publicAgent, categoryId);
    const { driverId } = await createApprovedDriver(
      "expire.driver@example.com",
      "EX-001-GN",
      adminAgent,
      csrf
    );

    const created = await adminAgent.post("/api/admin/assignments").set(csrf).send({
      bookingId,
      driverId,
    });

    await Assignment.findByIdAndUpdate(created.body.data.id, {
      expiresAt: new Date(Date.now() - 1000),
    });

    const expiredCount = await assignmentService.expirePendingAssignments();
    expect(expiredCount).toBe(1);

    const assignment = await Assignment.findById(created.body.data.id);
    expect(assignment?.status).toBe("expired");

    const booking = await Booking.findById(bookingId);
    expect(booking?.status).toBe("confirmed");

    const audit = await AuditLog.findOne({ event: "assignment.expired" });
    expect(audit).toBeTruthy();
  });

  it("returns assignment detail with booking, driver, and history", async () => {
    const { bookingId } = await createConfirmedBooking(publicAgent, categoryId);
    const { driverId } = await createApprovedDriver(
      "detail.driver@example.com",
      "DT-001-GN",
      adminAgent,
      csrf
    );

    const created = await adminAgent.post("/api/admin/assignments").set(csrf).send({
      bookingId,
      driverId,
    });

    const response = await adminAgent
      .get(`/api/admin/assignments/${created.body.data.id}`)
      .set(csrf);

    expect(response.status).toBe(200);
    expect(response.body.data.booking.bookingNumber).toBeDefined();
    expect(response.body.data.driver.id).toBe(driverId);
    expect(response.body.data.history).toHaveLength(1);
  });

  it("notifies all approved drivers when a booking is confirmed", async () => {
    await createApprovedDriver("pool.one@example.com", "PL-101-GN", adminAgent, csrf);
    await createApprovedDriver("pool.two@example.com", "PL-102-GN", adminAgent, csrf);

    vi.mocked(emailService.sendDriverNewBookingEmail).mockClear();

    await createConfirmedBooking(publicAgent, categoryId, "pool.booking@example.com");

    expect(emailService.sendDriverNewBookingEmail).toHaveBeenCalledTimes(2);
    const emailed = vi
      .mocked(emailService.sendDriverNewBookingEmail)
      .mock.calls.map((call) => call[0].email);
    expect(emailed).toContain("pool.one@example.com");
    expect(emailed).toContain("pool.two@example.com");
  });

  it("does not list confirmed bookings before the driver accepts them", async () => {
    const { bookingId } = await createConfirmedBooking(publicAgent, categoryId);
    const { driverAgent } = await createApprovedDriver(
      "pool.pending@example.com",
      "PL-150-GN",
      adminAgent,
      csrf
    );

    const listResponse = await driverAgent.get("/api/drivers/bookings?scope=accepted");
    expect(listResponse.status).toBe(200);
    expect(
      listResponse.body.data.items.some((item: { id: string }) => item.id === bookingId)
    ).toBe(false);
    expect(
      listResponse.body.data.items.every((item: { status: string }) => item.status === "accepted")
    ).toBe(true);
  });

  it("lets a driver view and accept an open confirmed booking", async () => {
    const { bookingId, bookingNumber } = await createConfirmedBooking(publicAgent, categoryId);
    const { driverAgent } = await createApprovedDriver(
      "pool.accept@example.com",
      "PL-201-GN",
      adminAgent,
      csrf
    );

    const detail = await driverAgent.get(`/api/drivers/bookings/${bookingId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.bookingNumber).toBe(bookingNumber);
    expect(detail.body.data.canAccept).toBe(true);
    expect(detail.body.data.pricing.total).toBe(85);

    const accept = await driverAgent.post(`/api/drivers/bookings/${bookingId}/accept`);
    expect(accept.status).toBe(200);
    expect(accept.body.data.booking.status).toBe("accepted");
    expect(accept.body.data.assignment.status).toBe("accepted");

    const listResponse = await driverAgent.get("/api/drivers/bookings?scope=accepted");
    expect(listResponse.status).toBe(200);
    expect(
      listResponse.body.data.items.some(
        (item: { id: string }) => item.id === bookingId
      )
    ).toBe(true);

    const booking = await Booking.findById(bookingId);
    expect(booking?.status).toBe("accepted");
    expect(booking?.assignmentStatus).toBe("accepted");

    const assignment = await Assignment.findOne({ bookingId });
    expect(assignment?.status).toBe("accepted");

    const audit = await AuditLog.findOne({ event: "assignment.accepted" });
    expect(audit).toBeTruthy();
  });

  it("rejects a second driver when booking is already accepted from the pool", async () => {
    const { bookingId } = await createConfirmedBooking(publicAgent, categoryId);
    const driverOne = await createApprovedDriver(
      "pool.first@example.com",
      "PL-301-GN",
      adminAgent,
      csrf
    );
    const driverTwo = await createApprovedDriver(
      "pool.second@example.com",
      "PL-302-GN",
      adminAgent,
      csrf
    );

    const firstAccept = await driverOne.driverAgent.post(
      `/api/drivers/bookings/${bookingId}/accept`
    );
    expect(firstAccept.status).toBe(200);

    const secondView = await driverTwo.driverAgent.get(`/api/drivers/bookings/${bookingId}`);
    expect(secondView.status).toBe(200);
    expect(secondView.body.data.canAccept).toBe(false);
    expect(secondView.body.data.unavailableMessage).toBe(
      "This booking has already been accepted by another driver."
    );

    const secondAccept = await driverTwo.driverAgent.post(
      `/api/drivers/bookings/${bookingId}/accept`
    );
    expect(secondAccept.status).toBe(409);
    expect(secondAccept.body.error).toBe(
      "This booking has already been accepted by another driver."
    );
  });
});
