import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import app from "@/app";
import { Settings } from "@/infrastructure/database/models/Settings";
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
} from "../helpers/db";

describe("Settings routes", () => {
  beforeAll(async () => {
    await connectTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    await Settings.create({
      key: "global",
      maintenanceMode: false,
      comingSoonMode: true,
    });
  });

  it("GET /api/settings/public returns public settings", async () => {
    const response = await request(app).get("/api/settings/public");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.comingSoonMode).toBe(true);
  });
});
