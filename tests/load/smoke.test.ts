import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "@/app";

const CONCURRENT_REQUESTS = 50;

describe("Load smoke", () => {
  it(`handles ${CONCURRENT_REQUESTS} concurrent GET /health/live requests`, async () => {
    const responses = await Promise.all(
      Array.from({ length: CONCURRENT_REQUESTS }, () => request(app).get("/health/live"))
    );

    for (const response of responses) {
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    }
  });

  it(`handles ${CONCURRENT_REQUESTS} concurrent GET / requests`, async () => {
    const responses = await Promise.all(
      Array.from({ length: CONCURRENT_REQUESTS }, () => request(app).get("/"))
    );

    for (const response of responses) {
      expect(response.status).toBe(200);
      expect(response.body.status).toBe("operational");
    }
  });

  it("returns consistent 404 error shape under burst traffic", async () => {
    const responses = await Promise.all(
      Array.from({ length: 20 }, () => request(app).get("/api/nonexistent-endpoint"))
    );

    for (const response of responses) {
      expect(response.status).toBe(404);
      expect(response.body.errorCode).toBe("RESOURCE_NOT_FOUND");
    }
  });
});
