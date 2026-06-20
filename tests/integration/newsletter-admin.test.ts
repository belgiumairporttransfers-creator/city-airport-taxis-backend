import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import app from "@/app";
import { Admin } from "@/infrastructure/database/models/Admin";
import { Newsletter } from "@/infrastructure/database/models/Newsletter";
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
} from "../helpers/db";
import { getCsrfHeaderFromResponse, TEST_ADMIN } from "../helpers/auth";

describe("Newsletter admin routes", () => {
  beforeAll(async () => {
    await connectTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    await Admin.create(TEST_ADMIN);
    await Newsletter.create({ email: "admin-list@example.com", source: "website" });
  });

  it("lists newsletter subscribers for admin", async () => {
    const agent = request.agent(app);

    const loginResponse = await agent.post("/api/admin/auth/login").send({
      email: TEST_ADMIN.email,
      password: TEST_ADMIN.password,
    });

    const response = await agent.get("/api/admin/newsletters");

    expect(response.status).toBe(200);
    expect(response.body.data.items.length).toBeGreaterThan(0);
    expect(loginResponse.status).toBe(200);
  });

  it("deletes a newsletter subscriber by id", async () => {
    const agent = request.agent(app);
    const loginResponse = await agent.post("/api/admin/auth/login").send({
      email: TEST_ADMIN.email,
      password: TEST_ADMIN.password,
    });

    const listResponse = await agent.get("/api/admin/newsletters");
    const id = listResponse.body.data.items[0]._id;

    const deleteResponse = await agent
      .delete(`/api/admin/newsletters/${id}`)
      .set(getCsrfHeaderFromResponse(loginResponse));

    expect(deleteResponse.status).toBe(200);
  });
});
