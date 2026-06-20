import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../../src/app";

describe("App routes", () => {
  it("GET / returns operational status", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.status).toBe("operational");
  });

  it("GET /health/live returns 200", async () => {
    const response = await request(app).get("/health/live");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it("GET /health returns dependency report", async () => {
    const response = await request(app).get("/health");

    expect(response.body.services).toBeDefined();
    expect(response.body.services.mongodb).toBeDefined();
    expect(response.body.errorCode).toBeUndefined();
  });

  it("returns errorCode on 404", async () => {
    const response = await request(app).get("/api/does-not-exist");

    expect(response.status).toBe(404);
    expect(response.body.errorCode).toBe("RESOURCE_NOT_FOUND");
  });

  it("POST /api/upload/upload requires authentication", async () => {
    const response = await request(app).post("/api/upload/upload");

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.errorCode).toBeDefined();
  });
});
