import type {
  HourlyPricingResponse,
  HourlyServiceType,
} from "@/modules/vehicle-pricing/types/hourly-pricing.types";
import type { VehiclePricingStatus } from "@/modules/vehicle-pricing/types/vehicle-pricing.types";

type HourlyPricingLike = Record<string, unknown> & { toObject?: () => Record<string, unknown> };

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
    typeof (pricing as HourlyPricingLike).toObject === "function"
  ) {
    return (pricing as HourlyPricingLike).toObject!();
  }

  return pricing as Record<string, unknown>;
};

export const toHourlyPricingResponse = (pricing: unknown): HourlyPricingResponse => {
  const record = toRecord(pricing);

  return {
    _id: toIdString(record._id) ?? "",
    categoryId: toIdString(record.categoryId) ?? "",
    serviceType: (record.serviceType as HourlyServiceType) ?? "hourly",
    duration: Number(record.duration ?? 0),
    price: Number(record.price ?? 0),
    includedDistance: Number(record.includedDistance ?? 0),
    extraDistancePrice: Number(record.extraDistancePrice ?? 0),
    status: record.status as VehiclePricingStatus,
    sortOrder: Number(record.sortOrder ?? 0),
    createdBy: toIdString(record.createdBy),
    updatedBy: toIdString(record.updatedBy),
    createdAt: toIsoString(record.createdAt) ?? "",
    updatedAt: toIsoString(record.updatedAt) ?? "",
  };
};
