import { describe, expect, it, beforeAll, afterAll, afterEach } from "vitest";
import request from "supertest";
import app from "@/app";
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
} from "../helpers/db";

describe("Contact routes", () => {
  beforeAll(async () => {
    await connectTestDatabase();
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("POST /api/contact submits a contact message", async () => {
    const response = await request(app).post("/api/contact").send({
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      phone: "+32 2 520 75 26",
      subject: "Airport transfer inquiry",
      message: "I would like to book a transfer from Brussels Airport.",
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBeDefined();
    expect(response.body.message).toMatch(/sent successfully/i);
  });

  it("POST /api/contact rejects invalid payload", async () => {
    const response = await request(app).post("/api/contact").send({
      firstName: "John",
      lastName: "Doe",
      email: "bad-email",
      phone: "123",
      subject: "",
      message: "short",
    });

    expect(response.status).toBe(400);
    expect(response.body.errorCode).toBeDefined();
  });
});
