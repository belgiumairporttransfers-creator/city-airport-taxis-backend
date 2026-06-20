import { describe, expect, it } from "vitest";
import mongoose from "mongoose";
import APIFeature from "@/shared/utils/APIFeature";
import { Newsletter } from "@/infrastructure/database/models/Newsletter";

describe("APIFeature", () => {
  it("applies pagination defaults", async () => {
    const feature = new APIFeature(Newsletter, {}, {
      pagination: { defaultLimit: 10 },
      sort: { defaultSort: "-createdAt", allowedFields: ["createdAt", "email"] },
      disablePagination: true,
    });

    const query = feature.getQuery().getQuery();
    expect(query).toBeDefined();
  });

  it("escapes regex characters in search terms", () => {
    const feature = new APIFeature(Newsletter, { search: "test.*" }, {
      search: { searchFields: ["email"] },
      disablePagination: true,
    });

    const filter = feature.getFilter();
    expect(filter.$or?.[0].email.$regex).toBe("test\\.\\*");
  });

  it("ignores disallowed sort fields", () => {
    const feature = new APIFeature(Newsletter, { sort: "password" }, {
      sort: { defaultSort: "-createdAt", allowedFields: ["createdAt", "email"] },
      disablePagination: true,
    });

    expect(feature.getQuery()).toBeDefined();
  });

  it("applies boolean, comma-separated, and object id filters", () => {
    const objectId = new mongoose.Types.ObjectId().toHexString();
    const feature = new APIFeature(
      Newsletter,
      { active: "true", source: "website,coming-soon", _id: objectId },
      { filterFields: ["active", "source", "_id"], disablePagination: true }
    );

    const filter = feature.getFilter();
    expect(filter.active).toBe(true);
    expect(filter.source).toEqual({ $in: ["website", "coming-soon"] });
    expect(filter._id).toBe(objectId);
  });

  it("applies date range and custom filters", () => {
    const feature = new APIFeature(
      Newsletter,
      { startDate: "2024-01-01", endDate: "2024-12-31" },
      {
        dateRange: { field: "createdAt" },
        disablePagination: true,
      }
    );

    const filter = feature.getFilter();
    expect(filter.createdAt.$gte).toBeInstanceOf(Date);
    expect(filter.createdAt.$lte).toBeInstanceOf(Date);

    feature.addFilter({ source: "website" });
    expect(feature.getFilter().source).toBe("website");
  });

  it("limits selected fields and paginates query", () => {
    const feature = new APIFeature(
      Newsletter,
      { page: 2, limit: 5, fields: "email,source" },
      {
        pagination: { defaultLimit: 10, maxLimit: 20 },
        sort: { defaultSort: "-createdAt", allowedFields: ["createdAt"] },
        excludeFields: ["__v"],
        disablePagination: false,
      }
    );

    feature.limitFields();
    expect(feature.getQuery()).toBeDefined();
  });
});
