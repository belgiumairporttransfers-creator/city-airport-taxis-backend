import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import APIFeature from "@/shared/utils/APIFeature";
import { Newsletter } from "@/infrastructure/database/models/Newsletter";
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
} from "../helpers/db";

describe("APIFeature integration", () => {
  beforeAll(async () => {
    await connectTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    await Newsletter.insertMany([
      { email: "a@example.com", source: "website" },
      { email: "b@example.com", source: "website" },
      { email: "c@example.com", source: "coming-soon" },
    ]);
  });

  it("executes paginated newsletter queries", async () => {
    const result = await new APIFeature(Newsletter, { page: 1, limit: 2 }, {
      pagination: { defaultLimit: 20 },
      sort: { defaultSort: "-createdAt", allowedFields: ["createdAt", "email", "source"] },
      search: { searchFields: ["email"] },
    }).execute();

    expect(result.data).toHaveLength(2);
    expect(result.total).toBe(3);
    expect(result.pages).toBe(2);
    expect(result.hasNextPage).toBe(true);
    expect(result.hasPrevPage).toBe(false);
  });

  it("executes all matching documents without pagination metadata", async () => {
    const data = await new APIFeature(Newsletter, { source: "website" }, {
      filterFields: ["source"],
      disablePagination: true,
    }).executeAll();

    expect(data).toHaveLength(2);
  });
});
