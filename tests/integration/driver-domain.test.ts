import { describe, expect, it, beforeAll, afterAll, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "@/app";
import { Admin } from "@/infrastructure/database/models/Admin";
import { User } from "@/infrastructure/database/models/User";
import { DriverApplication } from "@/infrastructure/database/models/DriverApplication";
import emailService from "@/infrastructure/email/email.service";
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

const PNG_FILE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const PDF_FILE = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a]);

describe("Driver onboarding integration", () => {
  let agent: request.SuperAgentTest;
  let adminAgent: request.SuperAgentTest;
  let csrf: Record<string, string>;
  let approvedSetupToken = "";

  beforeAll(async () => {
    process.env.REQUIRE_EMAIL_VERIFICATION = "false";
    await connectTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    await Admin.create(TEST_ADMIN);
    agent = request.agent(app);
    adminAgent = request.agent(app);
    ({ csrf } = await loginAdmin(adminAgent));
    approvedSetupToken = "";
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
    vi.spyOn(emailService, "sendDriverApplicationApprovedEmail").mockImplementation(
      async (_application, setupToken) => {
        approvedSetupToken = setupToken;
        return true;
      }
    );
  });

  const submitApplication = async (payload = buildDriverApplicationPayload()) => {
    const response = await agent.post("/api/drivers/apply").send(payload);
    expect(response.status).toBe(201);
    return response.body.data;
  };

  const getApplicationId = async (applicationNumber: string) => {
    const application = await DriverApplication.findOne({ applicationNumber });
    expect(application).toBeTruthy();
    return application!._id.toString();
  };

  describe("Public driver routes", () => {
    it("submits a driver application and returns application number", async () => {
      const data = await submitApplication();

      expect(data.applicationNumber).toMatch(/^DRV-\d{4}$/);
      expect(data.status).toBe("pending");

      const stored = await DriverApplication.findOne({ applicationNumber: data.applicationNumber });
      expect(stored?.email).toBe("jan.driver@example.com");
      expect(stored?.licensePlate).toBe("AB-123-CD");
    });

    it("returns application status by application number", async () => {
      const { applicationNumber } = await submitApplication();

      const response = await agent.get(
        `/api/drivers/application-status/${applicationNumber}`
      );

      expect(response.status).toBe(200);
      expect(response.body.data.applicationNumber).toBe(applicationNumber);
      expect(response.body.data.status).toBe("pending");
      expect(response.body.data.reviewNotes).toBeUndefined();
    });

    it("rejects duplicate active applications for the same email", async () => {
      await submitApplication();

      const response = await agent
        .post("/api/drivers/apply")
        .send(buildDriverApplicationPayload({ licensePlate: "XY-999-ZZ" }));

      expect(response.status).toBe(409);
    });

    it("allows a new application after a rejected application for the same email", async () => {
      const { applicationNumber } = await submitApplication();
      const applicationId = await getApplicationId(applicationNumber);

      await adminAgent
        .post(`/api/admin/drivers/${applicationId}/start-review`)
        .set(csrf);

      await adminAgent
        .post(`/api/admin/drivers/${applicationId}/reject`)
        .set(csrf)
        .send({ reviewNotes: "Incomplete documentation." });

      const response = await agent
        .post("/api/drivers/apply")
        .send(buildDriverApplicationPayload({ licensePlate: "XY-999-ZZ" }));

      expect(response.status).toBe(201);
    });

    it("validates required documents on apply", async () => {
      const payload = buildDriverApplicationPayload();
      const documents = { ...payload.documents } as Record<string, string>;
      delete documents.driverLicenseFront;

      const response = await agent.post("/api/drivers/apply").send({
        ...payload,
        documents,
      });

      expect(response.status).toBe(400);
    });

    it("validates availableFrom and availableTo time format", async () => {
      const response = await agent.post("/api/drivers/apply").send(
        buildDriverApplicationPayload({
          availableFrom: "25:00",
        })
      );

      expect(response.status).toBe(400);
    });

    it("hides review notes unless status is changes_requested", async () => {
      const { applicationNumber } = await submitApplication();
      const applicationId = await getApplicationId(applicationNumber);

      const pendingStatus = await agent.get(
        `/api/drivers/application-status/${applicationNumber}`
      );
      expect(pendingStatus.body.data.reviewNotes).toBeUndefined();

      await adminAgent
        .post(`/api/admin/drivers/${applicationId}/start-review`)
        .set(csrf);

      const underReviewStatus = await agent.get(
        `/api/drivers/application-status/${applicationNumber}`
      );
      expect(underReviewStatus.body.data.reviewNotes).toBeUndefined();

      await adminAgent
        .post(`/api/admin/drivers/${applicationId}/request-changes`)
        .set(csrf)
        .send({ reviewNotes: "Please upload a clearer license photo." });

      const changesRequestedStatus = await agent.get(
        `/api/drivers/application-status/${applicationNumber}`
      );
      expect(changesRequestedStatus.body.data.reviewNotes).toBe(
        "Please upload a clearer license photo."
      );
    });
  });

  describe("Driver document upload", () => {
    it("uploads a PDF for a valid application", async () => {
      const { applicationNumber } = await submitApplication();

      const response = await agent
        .post("/api/drivers/upload-document")
        .field("applicationNumber", applicationNumber)
        .field("email", "jan.driver@example.com")
        .attach("file", PDF_FILE, {
          filename: "license.pdf",
          contentType: "application/pdf",
        });

      expect(response.status).toBe(200);
      expect(response.body.data.url).toBe("https://cdn.example.com/driver-doc.pdf");
      expect(response.body.data.publicId).toBe("driver-doc-id");
      expect(uploadToCloudinaryMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ resource_type: "raw" })
      );
    });

    it("uploads an image for a valid application", async () => {
      const { applicationNumber } = await submitApplication();

      const response = await agent
        .post("/api/drivers/upload-document")
        .field("applicationNumber", applicationNumber)
        .field("email", "jan.driver@example.com")
        .attach("file", PNG_FILE, {
          filename: "license.png",
          contentType: "image/png",
        });

      expect(response.status).toBe(200);
      expect(uploadToCloudinaryMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ resource_type: "image" })
      );
    });

    it("rejects upload without a valid application", async () => {
      const response = await agent
        .post("/api/drivers/upload-document")
        .field("applicationNumber", "DRV-9999")
        .field("email", "jan.driver@example.com")
        .attach("file", PDF_FILE, {
          filename: "license.pdf",
          contentType: "application/pdf",
        });

      expect(response.status).toBe(404);
    });

    it("rejects upload with wrong email", async () => {
      const { applicationNumber } = await submitApplication();

      const response = await agent
        .post("/api/drivers/upload-document")
        .field("applicationNumber", applicationNumber)
        .field("email", "wrong.email@example.com")
        .attach("file", PDF_FILE, {
          filename: "license.pdf",
          contentType: "application/pdf",
        });

      expect(response.status).toBe(403);
    });

    it("rejects upload for approved applications", async () => {
      const { applicationNumber } = await submitApplication();
      const applicationId = await getApplicationId(applicationNumber);

      await adminAgent
        .post(`/api/admin/drivers/${applicationId}/start-review`)
        .set(csrf);
      await adminAgent
        .post(`/api/admin/drivers/${applicationId}/approve`)
        .set(csrf);

      const response = await agent
        .post("/api/drivers/upload-document")
        .field("applicationNumber", applicationNumber)
        .field("email", "jan.driver@example.com")
        .attach("file", PDF_FILE, {
          filename: "license.pdf",
          contentType: "application/pdf",
        });

      expect(response.status).toBe(400);
    });
  });

  describe("Admin driver review lifecycle", () => {
    it("lists, reviews, requests changes, resubmits, approves, and suspends", async () => {
      const resubmitEmailSpy = vi.spyOn(emailService, "sendDriverApplicationResubmittedEmail");
      const suspendEmailSpy = vi.spyOn(emailService, "sendDriverSuspendedEmail");

      const { applicationNumber } = await submitApplication();
      const applicationId = await getApplicationId(applicationNumber);

      const listResponse = await adminAgent.get("/api/admin/drivers").set(csrf);
      expect(listResponse.status).toBe(200);
      expect(listResponse.body.data.items).toHaveLength(1);
      expect(listResponse.body.data.items[0].applicationNumber).toBe(applicationNumber);

      const statsResponse = await adminAgent.get("/api/admin/drivers/stats").set(csrf);
      expect(statsResponse.status).toBe(200);
      expect(statsResponse.body.data).toEqual({
        pending: 1,
        underReview: 0,
        changesRequested: 0,
        approved: 0,
        rejected: 0,
        suspended: 0,
        total: 1,
      });

      const startReviewResponse = await adminAgent
        .post(`/api/admin/drivers/${applicationId}/start-review`)
        .set(csrf);
      expect(startReviewResponse.status).toBe(200);
      expect(startReviewResponse.body.data.status).toBe("under_review");

      const requestChangesResponse = await adminAgent
        .post(`/api/admin/drivers/${applicationId}/request-changes`)
        .set(csrf)
        .send({ reviewNotes: "Please upload a clearer license photo." });
      expect(requestChangesResponse.status).toBe(200);
      expect(requestChangesResponse.body.data.status).toBe("changes_requested");

      const resubmitResponse = await agent
        .post(`/api/drivers/application/${applicationNumber}/resubmit`)
        .send({
          email: "jan.driver@example.com",
          documents: {
            driverLicenseFront: "https://cdn.example.com/drivers/driverLicenseFront-updated.pdf",
          },
        });
      expect(resubmitResponse.status).toBe(200);
      expect(resubmitResponse.body.data.status).toBe("under_review");
      expect(resubmitEmailSpy).toHaveBeenCalled();

      const approveResponse = await adminAgent
        .post(`/api/admin/drivers/${applicationId}/approve`)
        .set(csrf);
      expect(approveResponse.status).toBe(200);
      expect(approveResponse.body.data.status).toBe("approved");
      expect(approveResponse.body.data.userId).toBeTruthy();
      expect(approvedSetupToken).toBeTruthy();

      const user = await User.findOne({ email: "jan.driver@example.com" });
      expect(user?.role).toBe("driver");
      expect(user?.status).toBe("active");
      expect(user?.isVerified).toBe(true);

      const setPasswordResponse = await agent.post("/api/auth/set-password").send({
        token: approvedSetupToken,
        password: "DriverPass123!",
      });
      expect(setPasswordResponse.status).toBe(200);

      const driverAgent = request.agent(app);
      const loginResponse = await driverAgent.post("/api/auth/login").send({
        email: "jan.driver@example.com",
        password: "DriverPass123!",
      });
      expect(loginResponse.status).toBe(200);

      const meResponse = await driverAgent.get("/api/auth/me");
      expect(meResponse.status).toBe(200);
      expect(meResponse.body.data.role).toBe("driver");

      const suspendResponse = await adminAgent
        .post(`/api/admin/drivers/${applicationId}/suspend`)
        .set(csrf)
        .send({ reviewNotes: "Policy violation" });
      expect(suspendResponse.status).toBe(200);
      expect(suspendResponse.body.data.status).toBe("suspended");
      expect(suspendEmailSpy).toHaveBeenCalled();

      const suspendedUser = await User.findOne({ email: "jan.driver@example.com" });
      expect(suspendedUser?.status).toBe("suspended");
    });

    it("rejects an application under review", async () => {
      const { applicationNumber } = await submitApplication();
      const applicationId = await getApplicationId(applicationNumber);

      await adminAgent
        .post(`/api/admin/drivers/${applicationId}/start-review`)
        .set(csrf);

      const rejectResponse = await adminAgent
        .post(`/api/admin/drivers/${applicationId}/reject`)
        .set(csrf)
        .send({ reviewNotes: "Incomplete documentation." });

      expect(rejectResponse.status).toBe(200);
      expect(rejectResponse.body.data.status).toBe("rejected");
      expect(rejectResponse.body.data.reviewNotes).toBe("Incomplete documentation.");
    });

    it("links an existing user account on approval", async () => {
      const existingUser = await User.create({
        firstName: "Existing",
        lastName: "User",
        email: "existing.driver@example.com",
        password: "Password123!",
        role: "user",
        status: "active",
        isVerified: true,
      });

      const { applicationNumber } = await submitApplication(
        buildDriverApplicationPayload({ email: "existing.driver@example.com" })
      );
      const applicationId = await getApplicationId(applicationNumber);

      await adminAgent
        .post(`/api/admin/drivers/${applicationId}/start-review`)
        .set(csrf);

      const approveResponse = await adminAgent
        .post(`/api/admin/drivers/${applicationId}/approve`)
        .set(csrf);

      expect(approveResponse.status).toBe(200);
      expect(approveResponse.body.data.userId).toBe(existingUser._id.toString());

      const updatedUser = await User.findById(existingUser._id);
      expect(updatedUser?.role).toBe("driver");
    });

    it("updates an editable application via admin patch", async () => {
      const { applicationNumber } = await submitApplication();
      const applicationId = await getApplicationId(applicationNumber);

      const response = await adminAgent
        .patch(`/api/admin/drivers/${applicationId}`)
        .set(csrf)
        .send({ phone: "+31698765432" });

      expect(response.status).toBe(200);
      expect(response.body.data.phone).toBe("+31698765432");
    });

    it("rejects admin patch on locked applications", async () => {
      const { applicationNumber } = await submitApplication();
      const applicationId = await getApplicationId(applicationNumber);

      await adminAgent
        .post(`/api/admin/drivers/${applicationId}/start-review`)
        .set(csrf);
      await adminAgent
        .post(`/api/admin/drivers/${applicationId}/reject`)
        .set(csrf)
        .send({ reviewNotes: "Incomplete documentation." });

      const response = await adminAgent
        .patch(`/api/admin/drivers/${applicationId}`)
        .set(csrf)
        .send({ phone: "+31698765432" });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe("This application is locked and cannot be edited");
    });

    it("rejects resubmit when status is not changes_requested", async () => {
      const { applicationNumber } = await submitApplication();

      const response = await agent
        .post(`/api/drivers/application/${applicationNumber}/resubmit`)
        .send({
          email: "jan.driver@example.com",
          phone: "+31698765432",
        });

      expect(response.status).toBe(400);
    });
  });
});
