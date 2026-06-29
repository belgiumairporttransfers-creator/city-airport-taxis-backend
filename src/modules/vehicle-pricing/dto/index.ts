import type {
  VehiclePricingResponse,
  VehiclePricingStatus,
  VehiclePricingType,
} from "@/modules/vehicle-pricing/types/vehicle-pricing.types";

type VehiclePricingLike = Record<string, unknown> & { toObject?: () => Record<string, unknown> };

const toIdString = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "toString" in value) {
    return String(value);
  }
  return undefined;
};

const toIsoString = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return undefined;
};

const toRecord = (pricing: unknown): Record<string, unknown> => {
  if (
    typeof pricing === "object" &&
    pricing !== null &&
    typeof (pricing as VehiclePricingLike).toObject === "function"
  ) {
    return (pricing as VehiclePricingLike).toObject!();
  }

  return pricing as Record<string, unknown>;
};

export const toVehiclePricingResponse = (pricing: unknown): VehiclePricingResponse => {
  const record = toRecord(pricing);
  const pricingType = record.pricingType as VehiclePricingType;
  const storedPerUnitRate =
    record.perUnitRate === undefined || record.perUnitRate === null
      ? record.perKmRate === undefined || record.perKmRate === null
        ? undefined
        : Number(record.perKmRate)
      : Number(record.perUnitRate);
  const storedIncrease =
    record.increasePercentage === undefined || record.increasePercentage === null
      ? undefined
      : Number(record.increasePercentage);

  const perUnitRate =
    pricingType === "base_plus_per_unit"
      ? (storedPerUnitRate ?? storedIncrease)
      : storedPerUnitRate;
  const increasePercentage =
    pricingType === "base_plus_per_unit" &&
    storedPerUnitRate !== undefined &&
    storedIncrease !== undefined &&
    storedPerUnitRate === storedIncrease
      ? undefined
      : pricingType === "base_plus_per_unit" && storedPerUnitRate === undefined
        ? undefined
        : storedIncrease;

  return {
    _id: toIdString(record._id) ?? "",
    categoryId: toIdString(record.categoryId) ?? "",
    minDistance: Number(record.minDistance ?? 0),
    maxDistance:
      record.maxDistance === null || record.maxDistance === undefined
        ? null
        : Number(record.maxDistance),
    pricingType,
    priceAmount: Number(record.priceAmount ?? 0),
    perUnitRate,
    increasePercentage,
    status: record.status as VehiclePricingStatus,
    sortOrder: Number(record.sortOrder ?? 0),
    createdBy: toIdString(record.createdBy),
    updatedBy: toIdString(record.updatedBy),
    createdAt: toIsoString(record.createdAt) ?? "",
    updatedAt: toIsoString(record.updatedAt) ?? "",
  };
};
