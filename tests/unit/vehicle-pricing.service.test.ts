import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  analyzePricingStructure,
  calculateFareAmount,
  countOpenEndedSlabs,
  distanceMatchesSlab,
  slabsOverlap,
} from "@/modules/vehicle-pricing/utils/pricing.utils";

vi.mock("@/modules/vehicle-categories/repositories/vehicle-category.repository", () => ({
  default: {
    findById: vi.fn(),
  },
}));

vi.mock("@/modules/vehicle-pricing/repositories/vehicle-pricing.repository", () => ({
  default: {
    create: vi.fn(),
    findById: vi.fn(),
    findWithPagination: vi.fn(),
    updateById: vi.fn(),
    deleteById: vi.fn(),
    findByCategoryId: vi.fn(),
    findSlabForDistance: vi.fn(),
    hasOverlappingSlab: vi.fn(),
    countByCategoryId: vi.fn(),
  },
}));

vi.mock("@/shared/audit/audit.service", () => ({
  default: {
    log: vi.fn(),
  },
}));

import vehiclePricingService from "@/modules/vehicle-pricing/services/vehicle-pricing.service";
import vehicleCategoryRepository from "@/modules/vehicle-categories/repositories/vehicle-category.repository";
import vehiclePricingRepository from "@/modules/vehicle-pricing/repositories/vehicle-pricing.repository";

const activeCategory = {
  _id: "507f1f77bcf86cd799439011",
  status: "active",
  name: "Executive Sedan",
};

describe("vehicle pricing utils", () => {
  it("detects overlapping slabs", () => {
    expect(slabsOverlap({ minDistance: 0, maxDistance: 50 }, { minDistance: 40, maxDistance: 100 })).toBe(
      true
    );
    expect(slabsOverlap({ minDistance: 0, maxDistance: 50 }, { minDistance: 50, maxDistance: 100 })).toBe(
      false
    );
  });

  it("allows only one open-ended slab in a structure", () => {
    expect(
      countOpenEndedSlabs([
        { maxDistance: 50 },
        { maxDistance: null },
        { maxDistance: null },
      ])
    ).toBe(2);
  });

  it("calculates fixed, per_unit, and base_plus_per_unit fares", () => {
    expect(calculateFareAmount("fixed", 45, 30)).toBe(45);
    expect(calculateFareAmount("fixed", 100, 10, { increasePercentage: -10 })).toBe(90);
    expect(calculateFareAmount("per_unit", 1.2, 75)).toBe(90);
    expect(calculateFareAmount("per_unit", 1.1, 120, { increasePercentage: 5 })).toBe(138.6);
    expect(calculateFareAmount("base_plus_per_unit", 20, 75, { perUnitRate: 1.2 })).toBe(110);
    expect(
      calculateFareAmount("base_plus_per_unit", 20, 75, { perUnitRate: 1.2, increasePercentage: 10 })
    ).toBe(121);
  });

  it("matches distance against half-open slabs", () => {
    expect(distanceMatchesSlab(75, 50, 100)).toBe(true);
    expect(distanceMatchesSlab(50, 50, 100)).toBe(true);
    expect(distanceMatchesSlab(100, 50, 100)).toBe(false);
    expect(distanceMatchesSlab(150, 150, null)).toBe(true);
  });

  it("reports gaps and complete coverage", () => {
    const incomplete = analyzePricingStructure([
      {
        _id: "a",
        minDistance: 0,
        maxDistance: 50,
        pricingType: "fixed",
        priceAmount: 45,
      },
      {
        _id: "b",
        minDistance: 60,
        maxDistance: null,
        pricingType: "per_unit",
        priceAmount: 1.2,
      },
    ]);

    expect(incomplete.isComplete).toBe(false);
    expect(incomplete.gaps).toEqual([{ fromDistance: 50, toDistance: 60 }]);
    expect(incomplete.openEndedCount).toBe(1);

    const complete = analyzePricingStructure([
      {
        _id: "a",
        minDistance: 0,
        maxDistance: 50,
        pricingType: "fixed",
        priceAmount: 45,
      },
      {
        _id: "b",
        minDistance: 50,
        maxDistance: null,
        pricingType: "per_unit",
        priceAmount: 1.2,
      },
    ]);

    expect(complete.isComplete).toBe(true);
    expect(complete.gaps).toHaveLength(0);
    expect(complete.overlaps).toHaveLength(0);
  });
});

describe("VehiclePricingService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects slab creation when category is inactive", async () => {
    vi.mocked(vehicleCategoryRepository.findById).mockResolvedValue({
      ...activeCategory,
      status: "inactive",
    } as never);

    await expect(
      vehiclePricingService.createSlab(
        {
          categoryId: activeCategory._id,
          minDistance: 0,
          maxDistance: 50,
          pricingType: "fixed",
          priceAmount: 45,
        },
        "admin-1"
      )
    ).rejects.toThrow("Vehicle category is not active");
  });

  it("rejects overlapping slab creation", async () => {
    vi.mocked(vehicleCategoryRepository.findById).mockResolvedValue(activeCategory as never);
    vi.mocked(vehiclePricingRepository.hasOverlappingSlab).mockResolvedValue(true);

    await expect(
      vehiclePricingService.createSlab(
        {
          categoryId: activeCategory._id,
          minDistance: 40,
          maxDistance: 100,
          pricingType: "per_unit",
          priceAmount: 1.2,
        },
        "admin-1"
      )
    ).rejects.toThrow("Pricing slab overlaps with an existing slab for this category");
  });

  it("ignores inactive slabs for open-ended validation", async () => {
    vi.mocked(vehicleCategoryRepository.findById).mockResolvedValue(activeCategory as never);
    vi.mocked(vehiclePricingRepository.hasOverlappingSlab).mockResolvedValue(false);
    vi.mocked(vehiclePricingRepository.findByCategoryId).mockResolvedValue([] as never);
    vi.mocked(vehiclePricingRepository.create).mockResolvedValue({
      _id: "new-slab",
      categoryId: activeCategory._id,
      minDistance: 300,
      maxDistance: null,
      pricingType: "per_unit",
      priceAmount: 0.95,
      status: "active",
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    await expect(
      vehiclePricingService.createSlab(
        {
          categoryId: activeCategory._id,
          minDistance: 300,
          maxDistance: null,
          pricingType: "per_unit",
          priceAmount: 0.95,
        },
        "admin-1"
      )
    ).resolves.toBeDefined();
  });

  it("rejects a second open-ended slab", async () => {
    vi.mocked(vehicleCategoryRepository.findById).mockResolvedValue(activeCategory as never);
    vi.mocked(vehiclePricingRepository.hasOverlappingSlab).mockResolvedValue(false);
    vi.mocked(vehiclePricingRepository.findByCategoryId).mockResolvedValue([
      { _id: "existing", minDistance: 150, maxDistance: null },
    ] as never);

    await expect(
      vehiclePricingService.createSlab(
        {
          categoryId: activeCategory._id,
          minDistance: 300,
          maxDistance: null,
          pricingType: "per_unit",
          priceAmount: 0.95,
        },
        "admin-1"
      )
    ).rejects.toThrow("Only one open-ended pricing slab is allowed per category");
  });

  it("resolves fare for a matching distance slab", async () => {
    vi.mocked(vehicleCategoryRepository.findById).mockResolvedValue(activeCategory as never);
    vi.mocked(vehiclePricingRepository.findSlabForDistance).mockResolvedValue({
      _id: "slab-1",
      categoryId: activeCategory._id,
      minDistance: 50,
      maxDistance: 100,
      pricingType: "per_unit",
      priceAmount: 1.2,
      status: "active",
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const result = await vehiclePricingService.resolveFare(activeCategory._id, 75);

    expect(result.distance).toBe(75);
    expect(result.amount).toBe(90);
    expect(result.slab.pricingType).toBe("per_unit");
  });

  it("validates pricing coverage for a category", async () => {
    vi.mocked(vehicleCategoryRepository.findById).mockResolvedValue(activeCategory as never);
    vi.mocked(vehiclePricingRepository.findByCategoryId).mockResolvedValue([
      {
        _id: "a",
        minDistance: 0,
        maxDistance: 50,
        pricingType: "fixed",
        priceAmount: 45,
      },
      {
        _id: "b",
        minDistance: 50,
        maxDistance: null,
        pricingType: "per_unit",
        priceAmount: 1.2,
      },
    ] as never);

    const result = await vehiclePricingService.validateCategoryCoverage(
      activeCategory._id,
      "admin-1"
    );

    expect(result.isComplete).toBe(true);
    expect(result.overlaps).toHaveLength(0);
    expect(result.gaps).toHaveLength(0);
  });
});
