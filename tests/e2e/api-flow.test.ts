import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import app from "@/app";
import { Admin } from "@/infrastructure/database/models/Admin";
import { User } from "@/infrastructure/database/models/User";
import { Settings } from "@/infrastructure/database/models/Settings";
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
} from "../helpers/db";
import { getCsrfHeaderFromResponse, TEST_ADMIN, TEST_USER } from "../helpers/auth";

describe("E2E API flows", () => {
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
    await Settings.create({
      key: "global",
      maintenanceMode: false,
      comingSoonMode: false,
    });
  });

  it("runs full admin lifecycle: login → profile → refresh → logout", async () => {
    const agent = request.agent(app);

    const loginResponse = await agent.post("/api/admin/auth/login").send({
      email: TEST_ADMIN.email,
      password: TEST_ADMIN.password,
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.success).toBe(true);

    const meResponse = await agent.get("/api/admin/auth/me");
    expect(meResponse.status).toBe(200);
    expect(meResponse.body.data.email).toBe(TEST_ADMIN.email);

    const refreshResponse = await agent
      .post("/api/admin/auth/refresh")
      .set(getCsrfHeaderFromResponse(loginResponse));

    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.success).toBe(true);

    const meAfterRefresh = await agent.get("/api/admin/auth/me");
    expect(meAfterRefresh.status).toBe(200);

    const logoutResponse = await agent
      .post("/api/admin/auth/logout")
      .set(getCsrfHeaderFromResponse(refreshResponse));

    expect(logoutResponse.status).toBe(200);

    const meAfterLogout = await agent.get("/api/admin/auth/me");
    expect(meAfterLogout.status).toBe(401);
  });

  it("runs full user lifecycle: register → profile → refresh → public settings → newsletter", async () => {
    const agent = request.agent(app);

    const registerResponse = await agent.post("/api/auth/register").send(TEST_USER);

    expect(registerResponse.status).toBe(200);
    expect(registerResponse.body.data.email).toBe(TEST_USER.email);

    const meResponse = await agent.get("/api/auth/me");
    expect(meResponse.status).toBe(200);

    const refreshResponse = await agent
      .post("/api/auth/refresh")
      .set(getCsrfHeaderFromResponse(registerResponse));

    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.success).toBe(true);

    const settingsResponse = await request(app).get("/api/settings/public");
    expect(settingsResponse.status).toBe(200);
    expect(settingsResponse.body.data.maintenanceMode).toBe(false);

    const newsletterResponse = await request(app)
      .post("/api/newsletter")
      .send({ email: "e2e-flow@example.com", source: "coming-soon" });

    expect(newsletterResponse.status).toBe(200);
    expect(newsletterResponse.body.data.email).toBe("e2e-flow@example.com");
  });

  it("runs user login flow for existing verified account", async () => {
    await User.create({ ...TEST_USER, status: "active", isVerified: true });

    const agent = request.agent(app);
    const loginResponse = await agent.post("/api/auth/login").send({
      email: TEST_USER.email,
      password: TEST_USER.password,
    });

    expect(loginResponse.status).toBe(200);

    const refreshResponse = await agent
      .post("/api/auth/refresh")
      .set(getCsrfHeaderFromResponse(loginResponse));

    expect(refreshResponse.status).toBe(200);
  });

  it("rejects unauthenticated access to protected resources across domains", async () => {
    const adminMe = await request(app).get("/api/admin/auth/me");
    const userMe = await request(app).get("/api/auth/me");
    const upload = await request(app).post("/api/upload/upload");

    expect(adminMe.status).toBe(401);
    expect(userMe.status).toBe(401);
    expect(upload.status).toBe(401);
  });
});
