import type {
  PricingCoverageGap,
  PricingStructureValidationResult,
  ResolvedFareResult,
  VehiclePricingResponse,
  VehiclePricingType,
  BookingTripCategory,
} from "@/modules/vehicle-pricing/types/vehicle-pricing.types";

export type PricingSlabLike = {
  _id?: string;
  minDistance: number;
  maxDistance: number | null;
  pricingType: VehiclePricingType;
  priceAmount: number;
  perUnitRate?: number;
  increasePercentage?: number;
};

const roundMoney = (value: number): number => Math.round(value * 100) / 100;

export const getSlabUpperBound = (maxDistance: number | null): number =>
  maxDistance === null ? Number.POSITIVE_INFINITY : maxDistance;

export const slabsOverlap = (
  a: Pick<PricingSlabLike, "minDistance" | "maxDistance">,
  b: Pick<PricingSlabLike, "minDistance" | "maxDistance">
): boolean => {
  const aMax = getSlabUpperBound(a.maxDistance);
  const bMax = getSlabUpperBound(b.maxDistance);

  return a.minDistance < bMax && b.minDistance < aMax;
};

export const countOpenEndedSlabs = (slabs: Array<Pick<PricingSlabLike, "maxDistance">>): number =>
  slabs.filter((slab) => slab.maxDistance === null).length;

export const calculateFareAmount = (
  pricingType: VehiclePricingType,
  priceAmount: number,
  distance: number,
  options?: {
    perUnitRate?: number;
    increasePercentage?: number;
  }
): number => {
  const perUnitRate = options?.perUnitRate;
  const increasePercentage = options?.increasePercentage;
  const uplift = 1 + (increasePercentage ?? 0) / 100;
  let amount: number;

  switch (pricingType) {
    case "fixed":
      amount = priceAmount;
      break;
    case "per_unit":
      amount = distance * priceAmount;
      break;
    case "base_plus_per_unit":
      amount = priceAmount + distance * (perUnitRate ?? 0);
      break;
    default:
      amount = priceAmount;
  }

  return roundMoney(Math.max(0, amount * uplift));
};

export const distanceMatchesSlab = (
  distance: number,
  minDistance: number,
  maxDistance: number | null
): boolean => {
  if (distance < minDistance) {
    return false;
  }

  if (maxDistance === null) {
    return true;
  }

  return distance < maxDistance;
};

export const analyzePricingStructure = (
  slabs: Array<PricingSlabLike & { _id: string }>
): PricingStructureValidationResult => {
  const sorted = [...slabs].sort((a, b) => a.minDistance - b.minDistance);
  const overlaps: PricingStructureValidationResult["overlaps"] = [];
  const gaps: PricingCoverageGap[] = [];
  const openEndedCount = countOpenEndedSlabs(sorted);

  for (let i = 0; i < sorted.length; i += 1) {
    for (let j = i + 1; j < sorted.length; j += 1) {
      if (slabsOverlap(sorted[i], sorted[j])) {
        overlaps.push({ slabAId: sorted[i]._id, slabBId: sorted[j]._id });
      }
    }
  }

  if (sorted.length === 0) {
    return {
      isComplete: false,
      overlaps,
      gaps: [{ fromDistance: 0, toDistance: null }],
      openEndedCount,
    };
  }

  if (sorted[0].minDistance > 0) {
    gaps.push({ fromDistance: 0, toDistance: sorted[0].minDistance });
  }

  for (let i = 0; i < sorted.length - 1; i += 1) {
    const current = sorted[i];
    const next = sorted[i + 1];
    const currentMax = current.maxDistance;

    if (currentMax === null) {
      continue;
    }

    if (currentMax < next.minDistance) {
      gaps.push({ fromDistance: currentMax, toDistance: next.minDistance });
    }
  }

  const last = sorted[sorted.length - 1];
  const isComplete =
    sorted[0].minDistance === 0 &&
    last.maxDistance === null &&
    overlaps.length === 0 &&
    gaps.length === 0 &&
    openEndedCount === 1;

  return {
    isComplete,
    overlaps,
    gaps,
    openEndedCount,
  };
};

export const buildResolvedFareResult = (
  slab: VehiclePricingResponse,
  distance: number
): ResolvedFareResult => ({
  slab,
  distance,
  amount: calculateFareAmount(slab.pricingType, slab.priceAmount, distance, {
    perUnitRate: slab.perUnitRate,
    increasePercentage: slab.increasePercentage,
  }),
});

export const resolvePublicQuoteTotalPrice = (
  outwardAmount: number,
  category: BookingTripCategory = "one-way"
): number => {
  const outwardPrice = roundMoney(outwardAmount);

  if (category === "return-trip") {
    return roundMoney(outwardPrice * 2);
  }

  return outwardPrice;
};
