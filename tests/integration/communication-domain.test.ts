import { describe, expect, it, beforeAll, afterAll, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "@/app";
import { Admin } from "@/infrastructure/database/models/Admin";
import { User } from "@/infrastructure/database/models/User";
import { DriverApplication } from "@/infrastructure/database/models/DriverApplication";
import { AuditLog } from "@/infrastructure/database/models/AuditLog";
import { Conversation } from "@/infrastructure/database/models/Conversation";
import { Message } from "@/infrastructure/database/models/Message";
import emailService from "@/infrastructure/email/email.service";
import communicationPubSub from "@/modules/communication/socket/communication-pubsub";
import communicationGateway from "@/modules/communication/socket/communication.gateway";
import { DRIVER_DOCUMENT_FIELDS } from "@/modules/drivers/types/driver.types";
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
} from "../helpers/db";
import { getCsrfHeaderFromResponse, TEST_ADMIN } from "../helpers/auth";

vi.mock("@/infrastructure/storage/cloudinary", () => ({
  uploadToCloudinary: vi.fn().mockResolvedValue({
    success: true,
    url: "https://cdn.example.com/chat/file.png",
    public_id: "chat-file-id",
  }),
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

const createApprovedDriver = async () => {
  let approvedSetupToken = "";

  vi.spyOn(emailService, "sendDriverApplicationReceivedEmail").mockResolvedValue(true);
  vi.spyOn(emailService, "sendDriverApplicationUnderReviewEmail").mockResolvedValue(true);
  vi.spyOn(emailService, "sendDriverApplicationApprovedEmail").mockImplementation(
    async (_application, setupToken) => {
      approvedSetupToken = setupToken;
      return true;
    }
  );

  const agent = request.agent(app);
  const adminAgent = request.agent(app);
  const { csrf } = await loginAdmin(adminAgent);

  const applyResponse = await agent.post("/api/drivers/apply").send({
    operatingCountry: "Netherlands",
    operatingCity: "Amsterdam",
    firstName: "Chat",
    lastName: "Driver",
    email: "chat.driver@example.com",
    phone: "+31612345679",
    homeAddress: "Damrak 2",
    carType: "Mercedes E-Class",
    carColor: "Black",
    licensePlate: "CH-123-AT",
    carYearModel: "2022",
    yearsOfExperience: 5,
    shiftType: "both",
    availableFrom: "06:00",
    availableTo: "22:00",
    documents: buildDocuments(),
  });

  const applicationNumber = applyResponse.body.data.applicationNumber as string;
  const application = await DriverApplication.findOne({ applicationNumber });
  const applicationId = application!._id.toString();

  await adminAgent.post(`/api/admin/drivers/${applicationId}/start-review`).set(csrf);
  await adminAgent.post(`/api/admin/drivers/${applicationId}/approve`).set(csrf);
  expect(approvedSetupToken).toBeTruthy();

  await agent.post("/api/auth/set-password").send({
    token: approvedSetupToken,
    password: "DriverPass123!",
  });

  const driverAgent = request.agent(app);
  await driverAgent.post("/api/auth/login").send({
    email: "chat.driver@example.com",
    password: "DriverPass123!",
  });

  const driverMe = await driverAgent.get("/api/auth/me");
  const driverUserId = driverMe.body.data._id as string;

  return { adminAgent, driverAgent, csrf, driverUserId, applicationId };
};

describe("Communication domain integration", () => {
  let adminAgent: request.SuperAgentTest;
  let driverAgent: request.SuperAgentTest;
  let csrf: Record<string, string>;
  let adminId = "";
  let driverUserId = "";

  beforeAll(async () => {
    process.env.REQUIRE_EMAIL_VERIFICATION = "false";
    vi.stubEnv("SOCKET_ENABLED", "true");
    vi.stubEnv("REDIS_ENABLED", "false");
    await connectTestDatabase();
    await communicationPubSub.init();
  });

  afterAll(async () => {
    vi.unstubAllEnvs();
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    await Admin.create(TEST_ADMIN);
    vi.restoreAllMocks();

    const driver = await createApprovedDriver();
    adminAgent = driver.adminAgent;
    driverAgent = driver.driverAgent;
    csrf = driver.csrf;
    driverUserId = driver.driverUserId;

    adminAgent = request.agent(app);
    ({ csrf, adminId } = await loginAdmin(adminAgent));
  });

  it("creates admin-driver conversation and sends messages", async () => {
    const createResponse = await adminAgent
      .post("/api/admin/communication/conversations")
      .set(csrf)
      .send({
        participantAccountType: "user",
        participantAccountId: driverUserId,
      });

    expect(createResponse.status).toBe(200);
    expect(createResponse.body.success).toBe(true);
    expect(createResponse.body.data.participant.accountId).toBe(driverUserId);

    const conversationId = createResponse.body.data.id as string;

    const duplicateResponse = await adminAgent
      .post("/api/admin/communication/conversations")
      .set(csrf)
      .send({
        participantAccountType: "user",
        participantAccountId: driverUserId,
      });

    expect(duplicateResponse.status).toBe(200);
    expect(duplicateResponse.body.data.id).toBe(conversationId);

    const sendResponse = await adminAgent
      .post("/api/admin/communication/messages")
      .set(csrf)
      .send({
        conversationId,
        type: "text",
        content: "Hello driver, welcome aboard.",
      });

    expect(sendResponse.status).toBe(200);
    expect(sendResponse.body.data.content).toBe("Hello driver, welcome aboard.");

    const messageId = sendResponse.body.data.id as string;

    const listResponse = await driverAgent.get(
      `/api/communication/conversations/${conversationId}/messages`
    );
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data.items).toHaveLength(1);

    const unreadResponse = await driverAgent.get("/api/communication/unread-count");
    expect(unreadResponse.status).toBe(200);
    expect(unreadResponse.body.data.total).toBeGreaterThanOrEqual(1);

    const readResponse = await driverAgent
      .patch(`/api/communication/messages/${messageId}/read`)
      .send({ conversationId });
    expect(readResponse.status).toBe(200);

    const unreadAfterRead = await driverAgent.get("/api/communication/unread-count");
    expect(unreadAfterRead.body.data.total).toBe(0);

    const audit = await AuditLog.findOne({ event: "message.sent" });
    expect(audit).toBeTruthy();
  });

  it("rejects non-participant access", async () => {
    const createResponse = await adminAgent
      .post("/api/admin/communication/conversations")
      .set(csrf)
      .send({
        participantAccountType: "user",
        participantAccountId: driverUserId,
      });

    const conversationId = createResponse.body.data.id as string;

    const otherDriver = request.agent(app);
    await User.create({
      firstName: "Other",
      lastName: "Driver",
      email: "other.driver@example.com",
      password: "Password123!",
      role: "driver",
      status: "active",
      isVerified: true,
    });

    await otherDriver.post("/api/auth/login").send({
      email: "other.driver@example.com",
      password: "Password123!",
    });

    const forbidden = await otherDriver.get(
      `/api/communication/conversations/${conversationId}/messages`
    );
    expect(forbidden.status).toBe(403);
  });

  it("allows driver to reply to admin", async () => {
    const createResponse = await adminAgent
      .post("/api/admin/communication/conversations")
      .set(csrf)
      .send({
        participantAccountType: "user",
        participantAccountId: driverUserId,
      });

    const conversationId = createResponse.body.data.id as string;

    const replyResponse = await driverAgent.post("/api/communication/messages").send({
      conversationId,
      type: "text",
      content: "Thanks admin!",
    });

    expect(replyResponse.status).toBe(200);
    expect(replyResponse.body.data.sender.accountId).toBe(driverUserId);
  });

  it("searches conversations and messages", async () => {
    const createResponse = await adminAgent
      .post("/api/admin/communication/conversations")
      .set(csrf)
      .send({
        participantAccountType: "user",
        participantAccountId: driverUserId,
      });

    const conversationId = createResponse.body.data.id as string;

    await adminAgent.post("/api/admin/communication/messages").set(csrf).send({
      conversationId,
      type: "text",
      content: "Dispatch update for terminal 1",
    });

    const searchResponse = await adminAgent
      .get("/api/admin/communication/search")
      .query({ q: "terminal" });

    expect(searchResponse.status).toBe(200);
    expect(searchResponse.body.data.messages.length).toBeGreaterThanOrEqual(1);
  });

  it("soft deletes messages for conversation participants", async () => {
    const createResponse = await adminAgent
      .post("/api/admin/communication/conversations")
      .set(csrf)
      .send({
        participantAccountType: "user",
        participantAccountId: driverUserId,
      });

    const conversationId = createResponse.body.data.id as string;

    const sendResponse = await adminAgent
      .post("/api/admin/communication/messages")
      .set(csrf)
      .send({
        conversationId,
        type: "text",
        content: "Delete me",
      });

    const messageId = sendResponse.body.data.id as string;

    const adminDeleteResponse = await adminAgent
      .delete(`/api/admin/communication/messages/${messageId}`)
      .set(csrf);

    expect(adminDeleteResponse.status).toBe(200);

    const adminDeletedMessage = await Message.findById(messageId);
    expect(adminDeletedMessage).toBeNull();

    const resendResponse = await adminAgent
      .post("/api/admin/communication/messages")
      .set(csrf)
      .send({
        conversationId,
        type: "text",
        content: "Driver can delete this",
      });

    const incomingMessageId = resendResponse.body.data.id as string;

    const driverDeleteResponse = await driverAgent.delete(
      `/api/communication/messages/${incomingMessageId}`
    );

    expect(driverDeleteResponse.status).toBe(200);

    const driverDeletedMessage = await Message.findById(incomingMessageId);
    expect(driverDeletedMessage).toBeNull();
  });

  it("clears sidebar preview when the last message is deleted", async () => {
    const createResponse = await adminAgent
      .post("/api/admin/communication/conversations")
      .set(csrf)
      .send({
        participantAccountType: "user",
        participantAccountId: driverUserId,
      });

    const conversationId = createResponse.body.data.id as string;

    const sendResponse = await adminAgent
      .post("/api/admin/communication/messages")
      .set(csrf)
      .send({
        conversationId,
        type: "text",
        content: "Last visible message",
      });

    const messageId = sendResponse.body.data.id as string;

    const deleteResponse = await adminAgent
      .delete(`/api/admin/communication/messages/${messageId}`)
      .set(csrf);

    expect(deleteResponse.status).toBe(200);

    const conversation = await Conversation.findById(conversationId);
    expect(conversation?.lastMessagePreview).toBeUndefined();

    const listResponse = await adminAgent.get("/api/admin/communication/conversations");
    const listedConversation = listResponse.body.data.items.find(
      (item: { id: string }) => item.id === conversationId
    );

    expect(listedConversation.lastMessage).toBeUndefined();
  });

  it("publishes socket events through gateway", async () => {
    const emitSpy = vi.spyOn(communicationGateway, "handleMessage");

    const createResponse = await adminAgent
      .post("/api/admin/communication/conversations")
      .set(csrf)
      .send({
        participantAccountType: "user",
        participantAccountId: driverUserId,
      });

    const conversationId = createResponse.body.data.id as string;

    await adminAgent.post("/api/admin/communication/messages").set(csrf).send({
      conversationId,
      type: "text",
      content: "Realtime hello",
    });

    expect(emitSpy).toHaveBeenCalled();
    const events = emitSpy.mock.calls.map((call) => call[0].event);
    expect(events).toContain("message:new");

    emitSpy.mockRestore();
  });

  it("initiates and ends a call session", async () => {
    const callResponse = await adminAgent
      .post("/api/admin/communication/calls")
      .set(csrf)
      .send({
        receiverAccountType: "user",
        receiverAccountId: driverUserId,
        callType: "voice",
      });

    expect(callResponse.status).toBe(200);
    expect(callResponse.body.data.status).toBe("ringing");

    const callId = callResponse.body.data.id as string;

    const acceptResponse = await driverAgent
      .patch(`/api/communication/calls/${callId}/accept`)
      .send({});
    expect(acceptResponse.status).toBe(200);
    expect(acceptResponse.body.data.status).toBe("accepted");

    const endResponse = await adminAgent
      .patch(`/api/admin/communication/calls/${callId}/end`)
      .set(csrf)
      .send({ reason: "done" });

    expect(endResponse.status).toBe(200);
    expect(endResponse.body.data.status).toBe("ended");
  });

  it("lists conversations for admin and driver", async () => {
    await adminAgent
      .post("/api/admin/communication/conversations")
      .set(csrf)
      .send({
        participantAccountType: "user",
        participantAccountId: driverUserId,
      });

    const adminList = await adminAgent.get("/api/admin/communication/conversations");
    expect(adminList.status).toBe(200);
    expect(adminList.body.data.items.length).toBe(1);

    const driverList = await driverAgent.get("/api/communication/conversations");
    expect(driverList.status).toBe(200);
    expect(driverList.body.data.items.length).toBe(1);

    const count = await Conversation.countDocuments();
    expect(count).toBe(1);
  });
});
