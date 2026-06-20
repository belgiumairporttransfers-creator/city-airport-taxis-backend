import { describe, expect, it, beforeAll, afterAll, afterEach } from "vitest";
import request from "supertest";
import app from "@/app";
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
} from "../helpers/db";

describe("Newsletter routes", () => {
  beforeAll(async () => {
    await connectTestDatabase();
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("POST /api/newsletter subscribes a new email", async () => {
    const response = await request(app)
      .post("/api/newsletter")
      .send({ email: "newsletter@example.com", source: "coming-soon" });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.email).toBe("newsletter@example.com");
  });

  it("POST /api/newsletter is idempotent for duplicate email", async () => {
    await request(app).post("/api/newsletter").send({ email: "dup@example.com" });

    const response = await request(app)
      .post("/api/newsletter")
      .send({ email: "dup@example.com" });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it("POST /api/newsletter rejects invalid email", async () => {
    const response = await request(app).post("/api/newsletter").send({ email: "bad-email" });

    expect(response.status).toBe(400);
    expect(response.body.errorCode).toBeDefined();
  });
});
