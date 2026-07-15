import type { IVehicleCategory } from "@/modules/vehicle-categories/types/vehicle-category.types";
import type {
  VehicleCategoryPublicDetailResponse,
  VehicleCategoryPublicResponse,
  VehicleCategoryResponse,
} from "@/modules/vehicle-categories/types/vehicle-category.types";

type VehicleCategoryLike = IVehicleCategory | (Record<string, unknown> & { _id: unknown });

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

export const toVehicleCategoryResponse = (
  category: VehicleCategoryLike
): VehicleCategoryResponse => {
  const record =
    typeof (category as IVehicleCategory).toObject === "function"
      ? ((category as IVehicleCategory).toObject() as Record<string, unknown>)
      : (category as Record<string, unknown>);

  return {
    _id: toIdString(record._id) ?? "",
    name: record.name as string,
    slug: record.slug as string,
    description: record.description as string | undefined,
    image: record.image as string | undefined,
    passengerCapacity: Number(record.passengerCapacity ?? 0),
    luggageCapacity: Number(record.luggageCapacity ?? 0),
    sortOrder: Number(record.sortOrder ?? 0),
    status: record.status as VehicleCategoryResponse["status"],
    isDefault: Boolean(record.isDefault),
    requestForQuote: Boolean(record.requestForQuote),
    createdBy: toIdString(record.createdBy),
    updatedBy: toIdString(record.updatedBy),
    createdAt: toIsoString(record.createdAt) ?? "",
    updatedAt: toIsoString(record.updatedAt) ?? "",
  };
};

export const generateCategorySlug = (name: string): string =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

type CapacityVehicleLike = {
  make?: string;
  model?: string;
  passengerCapacity?: number;
  luggageCapacity?: number;
};

export const formatVehicleDisplayName = (vehicle: { make?: string; model?: string }) =>
  [vehicle.make, vehicle.model].filter(Boolean).join(" ");

export const deriveCategoryCapacities = (vehicles: CapacityVehicleLike[]) => {
  if (!vehicles.length) {
    return {
      passengerCapacity: 0,
      luggageCapacity: 0,
    };
  }

  const passengerCapacity = Math.max(
    ...vehicles.map((vehicle) => Number(vehicle.passengerCapacity ?? 0))
  );
  const luggageCapacity = Math.max(
    ...vehicles.map((vehicle) => Number(vehicle.luggageCapacity ?? 0))
  );

  return {
    passengerCapacity,
    luggageCapacity,
  };
};

type CategoryCapacityLike = {
  passengerCapacity?: number;
  luggageCapacity?: number;
};

export const resolveCategoryCapacities = (
  category: CategoryCapacityLike,
  vehicles: CapacityVehicleLike[] = []
) => {
  const stored = {
    passengerCapacity: Number(category.passengerCapacity ?? 0),
    luggageCapacity: Number(category.luggageCapacity ?? 0),
  };
  const derived = deriveCategoryCapacities(vehicles);
  const hasStoredMarketingValues = stored.passengerCapacity > 0 || stored.luggageCapacity > 0;

  if (hasStoredMarketingValues) {
    return stored;
  }

  return derived;
};

export const toVehicleCategoryPublicResponse = (
  category: VehicleCategoryLike,
  vehicles: CapacityVehicleLike[] = []
): VehicleCategoryPublicResponse => {
  const record =
    typeof (category as IVehicleCategory).toObject === "function"
      ? ((category as IVehicleCategory).toObject() as Record<string, unknown>)
      : (category as Record<string, unknown>);
  const capacities = resolveCategoryCapacities(
    {
      passengerCapacity: record.passengerCapacity as number | undefined,
      luggageCapacity: record.luggageCapacity as number | undefined,
    },
    vehicles
  );

  return {
    id: toIdString(record._id) ?? "",
    name: record.name as string,
    slug: record.slug as string,
    description: record.description as string | undefined,
    image: record.image as string | undefined,
    ...capacities,
    vehicles: vehicles.map(formatVehicleDisplayName).filter(Boolean),
  };
};

export const toVehicleCategoryPublicDetailResponse = (
  category: VehicleCategoryLike,
  options: {
    vehicles: CapacityVehicleLike[];
    activePricingSlabCount: number;
  }
): VehicleCategoryPublicDetailResponse => ({
  ...toVehicleCategoryPublicResponse(category, options.vehicles),
  hasActivePricing: options.activePricingSlabCount > 0,
  activePricingSlabCount: options.activePricingSlabCount,
  vehicleCount: options.vehicles.length,
});
