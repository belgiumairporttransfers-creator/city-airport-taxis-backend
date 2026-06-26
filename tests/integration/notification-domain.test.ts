import { describe, expect, it, beforeAll, afterAll, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "@/app";
import { Admin } from "@/infrastructure/database/models/Admin";
import { Notification } from "@/infrastructure/database/models/Notification";
import { DriverApplication } from "@/infrastructure/database/models/DriverApplication";
import { AuditLog } from "@/infrastructure/database/models/AuditLog";
import emailService from "@/infrastructure/email/email.service";
import notificationService from "@/modules/notifications/services/notification.service";
import notificationPubSub from "@/modules/notifications/socket/notification-pubsub";
import notificationGateway from "@/modules/notifications/socket/notification.gateway";
import { getSocketServer } from "@/infrastructure/socket/server";
import { SocketRooms } from "@/infrastructure/socket/rooms";
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
} from "../helpers/db";
import { getCsrfHeaderFromResponse, TEST_ADMIN } from "../helpers/auth";
import { DRIVER_DOCUMENT_FIELDS } from "@/modules/drivers/types/driver.types";

const uploadToCloudinaryMock = vi.fn();

vi.mock("@/infrastructure/storage/cloudinary", () => ({
  uploadToCloudinary: (...args: unknown[]) => uploadToCloudinaryMock(...args),
}));

const loginAdmin = async (agent: request.SuperAgentTest) => {
  const loginResponse = await agent.post("/api/admin/auth/login").send({
    email: TEST_ADMIN.email,
    password: TEST_ADMIN.password,
  });

  expect(loginResponse.status).toBe(200);

  return {
    csrf: getCsrfHeaderFromResponse(loginResponse),
    adminId: loginResponse.body.data._id as string,
  };
};

const buildDocuments = () =>
  Object.fromEntries(
    DRIVER_DOCUMENT_FIELDS.map((field, index) => [
      field,
      `https://cdn.example.com/drivers/${field}-${index}.pdf`,
    ])
  );

const buildDriverApplicationPayload = (overrides: Record<string, unknown> = {}) => ({
  operatingCountry: "Netherlands",
  operatingCity: "Amsterdam",
  firstName: "Jan",
  lastName: "Driver",
  email: "jan.driver@example.com",
  phone: "+31612345678",
  homeAddress: "Damrak 1, Amsterdam",
  carType: "Mercedes E-Class",
  carColor: "Black",
  licensePlate: "AB-123-CD",
  carYearModel: "2022",
  yearsOfExperience: 5,
  shiftType: "both",
  availableFrom: "06:00",
  availableTo: "22:00",
  documents: buildDocuments(),
  ...overrides,
});

describe("Notification domain integration", () => {
  let adminAgent: request.SuperAgentTest;
  let publicAgent: request.SuperAgentTest;
  let csrf: Record<string, string>;
  let adminId = "";

  beforeAll(async () => {
    process.env.REQUIRE_EMAIL_VERIFICATION = "false";
    vi.stubEnv("SOCKET_ENABLED", "true");
    vi.stubEnv("REDIS_ENABLED", "false");
    await connectTestDatabase();
  });

  afterAll(async () => {
    vi.unstubAllEnvs();
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    await Admin.create(TEST_ADMIN);
    adminAgent = request.agent(app);
    publicAgent = request.agent(app);
    ({ csrf, adminId } = await loginAdmin(adminAgent));

    uploadToCloudinaryMock.mockReset();
    uploadToCloudinaryMock.mockResolvedValue({
      success: true,
      url: "https://cdn.example.com/driver-doc.pdf",
      public_id: "driver-doc-id",
    });

    vi.spyOn(emailService, "sendDriverApplicationReceivedEmail").mockResolvedValue(true);
    vi.spyOn(emailService, "sendDriverApplicationUnderReviewEmail").mockResolvedValue(true);
    vi.spyOn(emailService, "sendDriverChangesRequestedEmail").mockResolvedValue(true);
    vi.spyOn(emailService, "sendDriverApplicationRejectedEmail").mockResolvedValue(true);
    vi.spyOn(emailService, "sendDriverApplicationResubmittedEmail").mockResolvedValue(true);
    vi.spyOn(emailService, "sendDriverSuspendedEmail").mockResolvedValue(true);
    vi.spyOn(emailService, "sendDriverApplicationApprovedEmail").mockResolvedValue(true);
  });

  const createNotificationForAdmin = async (overrides: Record<string, unknown> = {}) => {
    const notification = await notificationService.create({
      title: "New Driver Application",
      message: "Test driver submitted a driver application.",
      type: "driver.application.submitted",
      severity: "info",
      entityType: "driver",
      recipientType: "admin",
      recipientIds: [adminId],
      ...overrides,
    });

    return notification._id.toString();
  };

  const submitDriverApplication = async () => {
    const response = await publicAgent
      .post("/api/drivers/apply")
      .send(buildDriverApplicationPayload());

    expect(response.status).toBe(201);
    return response.body.data;
  };

  const getApplicationId = async (applicationNumber: string) => {
    const application = await DriverApplication.findOne({ applicationNumber });
    expect(application).toBeTruthy();
    return application!._id.toString();
  };

  describe("NotificationService", () => {
    it("creates and persists a notification", async () => {
      const id = await createNotificationForAdmin({ title: "Persisted Notification" });

      const stored = await Notification.findById(id);
      expect(stored?.title).toBe("Persisted Notification");
      expect(stored?.isRead).toBe(false);
    });

    it("publishes redis/socket event on create", async () => {
      const publishSpy = vi.spyOn(notificationPubSub, "publish");

      await createNotificationForAdmin({ title: "Realtime Notification" });

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "notification:new",
          recipientType: "admin",
          recipientIds: [adminId],
          notification: expect.objectContaining({
            title: "Realtime Notification",
            isRead: false,
          }),
        })
      );
    });

    it("creates audit log on notification create", async () => {
      await createNotificationForAdmin({ type: "audit.create.test" });

      const audit = await AuditLog.findOne({ event: "notification.created" });
      expect(audit).toBeTruthy();
      expect(audit?.entityType).toBe("notification");
    });

    it("notifyAdmins creates one notification per admin", async () => {
      await Admin.create({
        firstName: "Second",
        lastName: "Admin",
        email: "second-admin@test.com",
        password: "Password123!",
        role: "admin",
      });

      await notificationService.notifyAdmins({
        title: "Admin Broadcast",
        message: "All admins should see this",
        type: "admin.broadcast",
        entityType: "system",
      });

      const notifications = await Notification.find({ title: "Admin Broadcast" });
      expect(notifications).toHaveLength(2);
    });
  });

  describe("Admin notification API", () => {
    it("returns paginated notifications newest first", async () => {
      await createNotificationForAdmin({ title: "Older", message: "First" });
      await new Promise((resolve) => setTimeout(resolve, 10));
      await createNotificationForAdmin({ title: "Newer", message: "Second" });

      const response = await adminAgent.get("/api/admin/notifications").set(csrf);

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(2);
      expect(response.body.data.items[0].title).toBe("Newer");
      expect(response.body.data.meta.total).toBe(2);
      expect(response.body.data.meta.page).toBe(1);
    });

    it("supports pagination query params", async () => {
      for (let index = 0; index < 3; index += 1) {
        await createNotificationForAdmin({ title: `Notification ${index}` });
      }

      const response = await adminAgent
        .get("/api/admin/notifications?page=2&limit=1")
        .set(csrf);

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.meta.page).toBe(2);
      expect(response.body.data.meta.limit).toBe(1);
      expect(response.body.data.meta.totalPages).toBe(3);
    });

    it("searches notifications by title and message", async () => {
      await createNotificationForAdmin({
        title: "New Driver Application",
        message: "Jan Driver submitted a driver application.",
      });
      await createNotificationForAdmin({
        title: "New Driver Application",
        message: "Another applicant from Rotterdam.",
      });

      const response = await adminAgent
        .get("/api/admin/notifications?search=Jan")
        .set(csrf);

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].message).toContain("Jan Driver");
    });

    it("filters notifications by isRead", async () => {
      const unreadId = await createNotificationForAdmin({ title: "Unread" });
      const readId = await createNotificationForAdmin({ title: "Read" });
      await notificationService.markAsRead(readId, adminId);

      const unreadResponse = await adminAgent
        .get("/api/admin/notifications?isRead=false")
        .set(csrf);

      expect(unreadResponse.status).toBe(200);
      expect(unreadResponse.body.data.items).toHaveLength(1);
      expect(unreadResponse.body.data.items[0].id).toBe(unreadId);

      const readResponse = await adminAgent
        .get("/api/admin/notifications?isRead=true")
        .set(csrf);

      expect(readResponse.status).toBe(200);
      expect(readResponse.body.data.items).toHaveLength(1);
      expect(readResponse.body.data.items[0].id).toBe(readId);
    });

    it("returns unread count", async () => {
      await createNotificationForAdmin();
      await createNotificationForAdmin();
      const readId = await createNotificationForAdmin();
      await notificationService.markAsRead(readId, adminId);

      const response = await adminAgent.get("/api/admin/notifications/unread-count").set(csrf);

      expect(response.status).toBe(200);
      expect(response.body.data.count).toBe(2);
    });

    it("marks a single notification as read", async () => {
      const id = await createNotificationForAdmin();

      const response = await adminAgent
        .patch(`/api/admin/notifications/${id}/read`)
        .set(csrf);

      expect(response.status).toBe(200);
      expect(response.body.data.isRead).toBe(true);
      expect(response.body.data.readAt).toBeTruthy();

      const stored = await Notification.findById(id);
      expect(stored?.isRead).toBe(true);
    });

    it("creates audit log when marking notification as read", async () => {
      const id = await createNotificationForAdmin();

      await adminAgent.patch(`/api/admin/notifications/${id}/read`).set(csrf);

      const audit = await AuditLog.findOne({ event: "notification.read", entityId: id });
      expect(audit).toBeTruthy();
      expect(audit?.actorId).toBe(adminId);
    });

    it("marks all notifications as read", async () => {
      await createNotificationForAdmin();
      await createNotificationForAdmin();

      const response = await adminAgent.patch("/api/admin/notifications/read-all").set(csrf);

      expect(response.status).toBe(200);

      const count = await Notification.countDocuments({
        recipientIds: adminId,
        isRead: true,
        type: "driver.application.submitted",
      });
      expect(count).toBe(2);

      const audit = await AuditLog.findOne({ event: "notification.read_all" });
      expect(audit).toBeTruthy();
    });

    it("deletes a notification", async () => {
      const id = await createNotificationForAdmin();

      const response = await adminAgent.delete(`/api/admin/notifications/${id}`).set(csrf);

      expect(response.status).toBe(200);
      expect(await Notification.findById(id)).toBeNull();
    });

    it("returns DTO fields without mongo internals", async () => {
      await createNotificationForAdmin({
        title: "DTO Test",
        type: "driver.application.submitted",
        entityType: "driver",
        entityId: "507f1f77bcf86cd799439011",
        actionUrl: "/drivers/507f1f77bcf86cd799439011",
      });

      const response = await adminAgent.get("/api/admin/notifications").set(csrf);

      expect(response.status).toBe(200);
      const item = response.body.data.items[0];
      expect(item).toMatchObject({
        title: "DTO Test",
        entityType: "driver",
        entityId: "507f1f77bcf86cd799439011",
        actionUrl: "/drivers/507f1f77bcf86cd799439011",
        severity: "info",
        isRead: false,
      });
      expect(item.id).toBeTruthy();
      expect(item._id).toBeUndefined();
      expect(item.__v).toBeUndefined();
      expect(item.recipientIds).toBeUndefined();
    });
  });

  describe("Authorization and validation", () => {
    it("requires admin authentication for listing notifications", async () => {
      const response = await request(app).get("/api/admin/notifications");
      expect(response.status).toBe(401);
    });

    it("requires admin authentication for unread count", async () => {
      const response = await request(app).get("/api/admin/notifications/unread-count");
      expect(response.status).toBe(401);
    });

    it("requires CSRF for mutating notification routes", async () => {
      const id = await createNotificationForAdmin();

      const readResponse = await adminAgent.patch(`/api/admin/notifications/${id}/read`);
      expect(readResponse.status).toBe(403);

      const readAllResponse = await adminAgent.patch("/api/admin/notifications/read-all");
      expect(readAllResponse.status).toBe(403);

      const deleteResponse = await adminAgent.delete(`/api/admin/notifications/${id}`);
      expect(deleteResponse.status).toBe(403);
    });

    it("validates notification id param", async () => {
      const response = await adminAgent
        .patch("/api/admin/notifications/not-a-valid-id/read")
        .set(csrf);

      expect(response.status).toBe(400);
    });

    it("validates pagination query params", async () => {
      const response = await adminAgent
        .get("/api/admin/notifications?page=0")
        .set(csrf);

      expect(response.status).toBe(400);
    });

    it("returns 404 when marking unknown notification as read", async () => {
      const response = await adminAgent
        .patch("/api/admin/notifications/507f1f77bcf86cd799439011/read")
        .set(csrf);

      expect(response.status).toBe(404);
    });
  });

  describe("Socket delivery", () => {
    it("emits notification:new to the correct admin room", async () => {
      const emitMock = vi.fn();
      const toMock = vi.fn().mockReturnValue({ emit: emitMock });
      const ioMock = { to: toMock };

      vi.spyOn(await import("@/infrastructure/socket/server"), "getSocketServer").mockReturnValue(
        ioMock as never
      );

      notificationGateway.handleMessage({
        event: "notification:new",
        recipientType: "admin",
        recipientIds: [adminId],
        notification: {
          id: "507f1f77bcf86cd799439011",
          title: "Socket Notification",
          message: "Delivered over socket",
          type: "socket.test",
          severity: "info",
          entityType: "system",
          isRead: false,
          createdAt: new Date().toISOString(),
        },
      });

      expect(toMock).toHaveBeenCalledWith(SocketRooms.admin(adminId));
      expect(emitMock).toHaveBeenCalledWith(
        "notification:new",
        expect.objectContaining({ title: "Socket Notification" })
      );

      vi.mocked(getSocketServer).mockRestore();
    });

    it("falls back to direct gateway delivery when redis is unavailable", async () => {
      const handleSpy = vi.spyOn(notificationGateway, "handleMessage");

      await notificationService.create({
        title: "Direct Delivery",
        message: "Redis disabled path",
        type: "socket.fallback",
        entityType: "system",
        recipientType: "admin",
        recipientIds: [adminId],
      });

      expect(handleSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "notification:new",
          notification: expect.objectContaining({ title: "Direct Delivery" }),
        })
      );

      handleSpy.mockRestore();
    });
  });

  describe("Driver workflow notifications", () => {
    it("creates notification when driver application is submitted", async () => {
      const data = await submitDriverApplication();

      const notifications = await Notification.find({ type: "driver.application.submitted" });
      expect(notifications).toHaveLength(1);
      expect(notifications[0].title).toBe("New Driver Application");
      expect(notifications[0].message).toContain("Jan Driver");
      expect(notifications[0].entityType).toBe("driver");
      expect(notifications[0].recipientIds).toContain(adminId);
      expect(notifications[0].actionUrl).toBe(`/drivers/${notifications[0].entityId}`);
    });

    it("does not create notification when driver resubmits documents", async () => {
      const { applicationNumber } = await submitDriverApplication();
      const applicationId = await getApplicationId(applicationNumber);

      await adminAgent.post(`/api/admin/drivers/${applicationId}/start-review`).set(csrf);
      await adminAgent
        .post(`/api/admin/drivers/${applicationId}/request-changes`)
        .set(csrf)
        .send({ reviewNotes: "Please upload clearer documents." });

      const resubmitResponse = await publicAgent
        .post(`/api/drivers/application/${applicationNumber}/resubmit`)
        .send({
          email: "jan.driver@example.com",
          documents: {
            driverLicenseFront: "https://cdn.example.com/drivers/driverLicenseFront-updated.pdf",
          },
        });

      expect(resubmitResponse.status).toBe(200);

      const notifications = await Notification.find({ type: "driver.application.resubmitted" });
      expect(notifications).toHaveLength(0);
    });

    it("does not create notification when driver application is approved", async () => {
      const { applicationNumber } = await submitDriverApplication();
      const applicationId = await getApplicationId(applicationNumber);

      await adminAgent.post(`/api/admin/drivers/${applicationId}/start-review`).set(csrf);
      const approveResponse = await adminAgent
        .post(`/api/admin/drivers/${applicationId}/approve`)
        .set(csrf);

      expect(approveResponse.status).toBe(200);

      const notifications = await Notification.find({ type: "driver.application.approved" });
      expect(notifications).toHaveLength(0);
    });

    it("does not create notification when driver application is rejected", async () => {
      const { applicationNumber } = await submitDriverApplication();
      const applicationId = await getApplicationId(applicationNumber);

      await adminAgent.post(`/api/admin/drivers/${applicationId}/start-review`).set(csrf);
      const rejectResponse = await adminAgent
        .post(`/api/admin/drivers/${applicationId}/reject`)
        .set(csrf)
        .send({ reviewNotes: "Incomplete documentation." });

      expect(rejectResponse.status).toBe(200);

      const notifications = await Notification.find({ type: "driver.application.rejected" });
      expect(notifications).toHaveLength(0);
    });

    it("does not create notification when driver is suspended", async () => {
      const { applicationNumber } = await submitDriverApplication();
      const applicationId = await getApplicationId(applicationNumber);

      await adminAgent.post(`/api/admin/drivers/${applicationId}/start-review`).set(csrf);
      await adminAgent.post(`/api/admin/drivers/${applicationId}/approve`).set(csrf);

      const suspendResponse = await adminAgent
        .post(`/api/admin/drivers/${applicationId}/suspend`)
        .set(csrf)
        .send({ reviewNotes: "Policy violation" });

      expect(suspendResponse.status).toBe(200);

      const notifications = await Notification.find({ type: "driver.application.suspended" });
      expect(notifications).toHaveLength(0);
    });

    it("returns only new driver application notifications to admin", async () => {
      await notificationService.create({
        title: "New Driver Application",
        message: "Visible driver application alert",
        type: "driver.application.submitted",
        entityType: "driver",
        recipientType: "admin",
        recipientIds: [adminId],
      });
      await notificationService.create({
        title: "Driver Approved",
        message: "Hidden approval alert",
        type: "driver.application.approved",
        entityType: "driver",
        recipientType: "admin",
        recipientIds: [adminId],
      });

      const response = await adminAgent.get("/api/admin/notifications").set(csrf);

      expect(response.status).toBe(200);
      expect(response.body.data.items.every((item: { type: string }) => item.type === "driver.application.submitted")).toBe(true);
      expect(response.body.data.items.some((item: { title: string }) => item.title === "Driver Approved")).toBe(false);
    });
  });
});
