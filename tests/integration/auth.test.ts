import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import app from "@/app";
import { Admin } from "@/infrastructure/database/models/Admin";
import { User } from "@/infrastructure/database/models/User";
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
} from "../helpers/db";
import { getCsrfHeaderFromResponse, TEST_ADMIN, TEST_USER } from "../helpers/auth";

describe("Auth integration", () => {
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
  });

  describe("Admin auth", () => {
    it("rejects invalid admin credentials", async () => {
      const response = await request(app).post("/api/admin/auth/login").send({
        email: TEST_ADMIN.email,
        password: "WrongPassword123!",
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it("logs in admin and returns profile via /me", async () => {
      const agent = request.agent(app);

      const loginResponse = await agent.post("/api/admin/auth/login").send({
        email: TEST_ADMIN.email,
        password: TEST_ADMIN.password,
      });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.headers["set-cookie"]).toBeDefined();

      const meResponse = await agent.get("/api/admin/auth/me");

      expect(meResponse.status).toBe(200);
      expect(meResponse.body.success).toBe(true);
      expect(meResponse.body.data.email).toBe(TEST_ADMIN.email);
    });

    it("rejects refresh without CSRF token", async () => {
      const agent = request.agent(app);

      await agent.post("/api/admin/auth/login").send({
        email: TEST_ADMIN.email,
        password: TEST_ADMIN.password,
      });

      const refreshResponse = await agent.post("/api/admin/auth/refresh");

      expect(refreshResponse.status).toBe(403);
      expect(refreshResponse.body.error).toContain("CSRF");
    });

    it("rejects protected admin route without authentication", async () => {
      const response = await request(app).get("/api/admin/auth/me");

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it("rejects mutating admin route without CSRF token", async () => {
      const agent = request.agent(app);

      await agent.post("/api/admin/auth/login").send({
        email: TEST_ADMIN.email,
        password: TEST_ADMIN.password,
      });

      const logoutResponse = await agent.post("/api/admin/auth/logout");

      expect(logoutResponse.status).toBe(403);
      expect(logoutResponse.body.error).toContain("CSRF");
    });

    it("logs out admin with valid CSRF token", async () => {
      const agent = request.agent(app);

      const loginResponse = await agent.post("/api/admin/auth/login").send({
        email: TEST_ADMIN.email,
        password: TEST_ADMIN.password,
      });

      const logoutResponse = await agent
        .post("/api/admin/auth/logout")
        .set(getCsrfHeaderFromResponse(loginResponse));

      expect(logoutResponse.status).toBe(200);
      expect(logoutResponse.body.success).toBe(true);

      const meResponse = await agent.get("/api/admin/auth/me");
      expect(meResponse.status).toBe(401);
    });

    it("records login activity after successful admin login", async () => {
      const agent = request.agent(app);

      await agent.post("/api/admin/auth/login").send({
        email: TEST_ADMIN.email,
        password: TEST_ADMIN.password,
      });

      const activitiesResponse = await agent.get("/api/admin/auth/activities");

      expect(activitiesResponse.status).toBe(200);
      expect(activitiesResponse.body.data.length).toBeGreaterThan(0);
      expect(activitiesResponse.body.data[0].type).toBe("login");
    });
  });

  describe("User auth", () => {
    it("registers and accesses protected profile", async () => {
      const agent = request.agent(app);

      const registerResponse = await agent.post("/api/auth/register").send(TEST_USER);

      expect(registerResponse.status).toBe(200);
      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.data.email).toBe(TEST_USER.email);

      const meResponse = await agent.get("/api/auth/me");
      expect(meResponse.status).toBe(200);
      expect(meResponse.body.data.email).toBe(TEST_USER.email);
    });

    it("logs in an existing user", async () => {
      await User.create({ ...TEST_USER, status: "active", isVerified: true });

      const agent = request.agent(app);
      const loginResponse = await agent.post("/api/auth/login").send({
        email: TEST_USER.email,
        password: TEST_USER.password,
      });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);

      const meResponse = await agent.get("/api/auth/me");
      expect(meResponse.status).toBe(200);
      expect(meResponse.body.data.email).toBe(TEST_USER.email);
    });

    it("rejects duplicate user registration", async () => {
      await User.create({ ...TEST_USER, status: "active", isVerified: true });

      const response = await request(app).post("/api/auth/register").send(TEST_USER);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });
  });
});
