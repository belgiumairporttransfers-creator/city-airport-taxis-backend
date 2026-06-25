import type { VehicleResponse } from "@/modules/vehicles/types/vehicle.types";

type VehicleLike = Record<string, unknown> & { toObject?: () => Record<string, unknown> };

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

const toRecord = (vehicle: unknown): Record<string, unknown> => {
  if (typeof vehicle === "object" && vehicle !== null && typeof (vehicle as VehicleLike).toObject === "function") {
    return (vehicle as VehicleLike).toObject!();
  }

  return vehicle as Record<string, unknown>;
};

export const toVehicleResponse = (vehicle: unknown): VehicleResponse => {
  const record = toRecord(vehicle);

  return {
    _id: toIdString(record._id) ?? "",
    categoryId: toIdString(record.categoryId) ?? "",
    registrationNumber: record.registrationNumber as string,
    make: record.make as string,
    model: record.model as string,
    year: record.year as number | undefined,
    color: record.color as string | undefined,
    passengerCapacity: Number(record.passengerCapacity ?? 0),
    luggageCapacity: Number(record.luggageCapacity ?? 0),
    status: record.status as VehicleResponse["status"],
    features: (record.features as string[] | undefined) ?? [],
    image: record.image as string | undefined,
    notes: record.notes as string | undefined,
    createdBy: toIdString(record.createdBy),
    updatedBy: toIdString(record.updatedBy),
    createdAt: toIsoString(record.createdAt) ?? "",
    updatedAt: toIsoString(record.updatedAt) ?? "",
  };
};

export const normalizeRegistrationNumber = (value: string): string =>
  value.trim().toUpperCase().replace(/\s+/g, "");
