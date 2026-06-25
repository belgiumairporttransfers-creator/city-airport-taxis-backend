import type { HydratedDocument, Types } from "mongoose";

export const VEHICLE_PRICING_TYPES = ["fixed", "per_unit", "base_plus_per_unit"] as const;
export type VehiclePricingType = (typeof VEHICLE_PRICING_TYPES)[number];

export const VEHICLE_PRICING_STATUSES = ["active", "inactive"] as const;
export type VehiclePricingStatus = (typeof VEHICLE_PRICING_STATUSES)[number];

export interface IVehiclePricing {
  _id: Types.ObjectId;
  categoryId: Types.ObjectId;
  minDistance: number;
  maxDistance: number | null;
  pricingType: VehiclePricingType;
  priceAmount: number;
  perKmRate?: number;
  increasePercentage?: number;
  status: VehiclePricingStatus;
  sortOrder: number;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type IVehiclePricingDocument = HydratedDocument<IVehiclePricing>;

export interface CreateVehiclePricingData {
  categoryId: string;
  minDistance: number;
  maxDistance: number | null;
  pricingType: VehiclePricingType;
  priceAmount: number;
  perKmRate?: number;
  increasePercentage?: number;
  status?: VehiclePricingStatus;
  sortOrder?: number;
}

export interface UpdateVehiclePricingData {
  minDistance?: number;
  maxDistance?: number | null;
  pricingType?: VehiclePricingType;
  priceAmount?: number;
  perKmRate?: number;
  increasePercentage?: number;
  status?: VehiclePricingStatus;
  sortOrder?: number;
}

export interface GetVehiclePricingQuery {
  page?: number;
  limit?: number;
  categoryId?: string;
  status?: VehiclePricingStatus;
  sort?: string;
}

export interface VehiclePricingResponse {
  _id: string;
  categoryId: string;
  minDistance: number;
  maxDistance: number | null;
  pricingType: VehiclePricingType;
  priceAmount: number;
  perKmRate?: number;
  increasePercentage?: number;
  status: VehiclePricingStatus;
  sortOrder: number;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PricingCoverageGap {
  fromKm: number;
  toKm: number | null;
}

export interface PricingStructureValidationResult {
  isComplete: boolean;
  overlaps: Array<{ slabAId: string; slabBId: string }>;
  gaps: PricingCoverageGap[];
  openEndedCount: number;
}

export interface ResolvedFareResult {
  slab: VehiclePricingResponse;
  distanceKm: number;
  amount: number;
}

export interface GetVehiclePricingQuotesQuery {
  distance: number;
}

export interface VehiclePricingQuoteItem {
  category: {
    _id: string;
    name: string;
    slug: string;
    description?: string;
    image?: string;
    passengerCapacity?: number;
    luggageCapacity?: number;
    handLuggageCapacity?: number;
    sortOrder: number;
    status: "active" | "inactive";
    isDefault: boolean;
  };
  fare: ResolvedFareResult | null;
  vehicles: Array<{
    _id: string;
    categoryId: string;
    registrationNumber: string;
    make: string;
    model: string;
    year?: number;
    color?: string;
    passengerCapacity: number;
    luggageCapacity: number;
    status: string;
    image?: string;
  }>;
}

export interface VehiclePricingQuotesResult {
  distanceKm: number;
  items: VehiclePricingQuoteItem[];
}

export interface VehiclePricingPublicQuote {
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  passengerCapacity: number;
  luggageCapacity: number;
  price: number;
}
