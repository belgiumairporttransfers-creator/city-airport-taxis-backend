import type { CreateVehiclePricingData } from "@/modules/vehicle-pricing/types/vehicle-pricing.types";
import type { VehiclePricingType } from "@/modules/vehicle-pricing/types/vehicle-pricing.types";

export type SampleVehiclePricing = Omit<CreateVehiclePricingData, "categoryId"> & {
  categorySlug: string;
};

const ECONOMY_SLUG = "economy";
const MAX_DISTANCE_KM = 10_000;

/** User-requested starter bands: 0–5, 6–8, 9–15 km, then progressively wider slabs to 10 000 km. */
const STARTER_BANDS: ReadonlyArray<readonly [number, number]> = [
  [0, 5],
  [6, 8],
  [9, 15],
];

const generateDistanceBands = (maxKm: number): Array<{ min: number; max: number }> => {
  const bands: Array<{ min: number; max: number }> = STARTER_BANDS.map(([min, max]) => ({
    min,
    max,
  }));

  let current = 16;
  let width = 10;

  while (current < maxKm) {
    const max = Math.min(current + width - 1, maxKm);
    bands.push({ min: current, max });
    current = max + 1;

    if (width < 15) {
      width += 3;
    } else if (width < 40) {
      width += 5;
    } else if (width < 100) {
      width += 12;
    } else if (width < 300) {
      width += 25;
    } else if (width < 800) {
      width += 50;
    } else {
      width += 100;
    }
  }

  return bands;
};

const pricingTypeForBand = (index: number): VehiclePricingType => {
  if (index < 5) {
    return "fixed";
  }

  if (index % 3 === 0) {
    return "fixed";
  }

  if (index % 3 === 1) {
    return "per_unit";
  }

  return "base_plus_per_unit";
};

const buildPriceFields = (
  band: { min: number; max: number },
  index: number,
  pricingType: VehiclePricingType
): Pick<CreateVehiclePricingData, "priceAmount" | "perUnitRate"> => {
  const span = band.max - band.min + 1;

  if (pricingType === "fixed") {
    return { priceAmount: Math.round(25 + band.min * 0.12 + span * 1.5) };
  }

  if (pricingType === "per_unit") {
    return { priceAmount: Math.round((1.2 + index * 0.02) * 100) / 100 };
  }

  return {
    priceAmount: Math.round(15 + band.min * 0.05),
    perUnitRate: Math.round((1.1 + index * 0.015) * 100) / 100,
  };
};

export const sampleVehiclePricing: SampleVehiclePricing[] = generateDistanceBands(
  MAX_DISTANCE_KM
).map((band, index) => {
  const pricingType = pricingTypeForBand(index);

  return {
    categorySlug: ECONOMY_SLUG,
    minDistance: band.min,
    maxDistance: band.max,
    pricingType,
    status: "active",
    sortOrder: index + 1,
    ...buildPriceFields(band, index, pricingType),
  };
});
