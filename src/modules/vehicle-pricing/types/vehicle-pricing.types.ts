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
  perUnitRate?: number;
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
  perUnitRate?: number;
  increasePercentage?: number;
  status?: VehiclePricingStatus;
  sortOrder?: number;
}

export interface UpdateVehiclePricingData {
  minDistance?: number;
  maxDistance?: number | null;
  pricingType?: VehiclePricingType;
  priceAmount?: number;
  perUnitRate?: number;
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
  search?: string;
}

export interface VehiclePricingResponse {
  _id: string;
  categoryId: string;
  minDistance: number;
  maxDistance: number | null;
  pricingType: VehiclePricingType;
  priceAmount: number;
  perUnitRate?: number;
  increasePercentage?: number;
  status: VehiclePricingStatus;
  sortOrder: number;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PricingCoverageGap {
  fromDistance: number;
  toDistance: number | null;
}

export interface PricingStructureValidationResult {
  isComplete: boolean;
  overlaps: Array<{ slabAId: string; slabBId: string }>;
  gaps: PricingCoverageGap[];
  openEndedCount: number;
}

export interface ResolvedFareResult {
  slab: VehiclePricingResponse;
  distance: number;
  amount: number;
}

export interface GetVehiclePricingQuotesQuery {
  distance: number;
}

export const BOOKING_TRIP_CATEGORIES = ["one-way", "hourly", "return-trip"] as const;
export type BookingTripCategory = (typeof BOOKING_TRIP_CATEGORIES)[number];

export interface GetPublicVehiclePricingQuotesQuery {
  distance?: number;
  passengers: number;
  category?: BookingTripCategory;
  duration?: number;
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
  distance: number;
  items: VehiclePricingQuoteItem[];
}

export interface VehiclePricingPublicQuotePriceBreakdown {
  totalPrice: number;
  includedDistance?: number;
  extraDistancePrice?: number;
}

export interface VehiclePricingPublicQuoteCategory {
  name: string;
  image?: string;
  vehicles: string[];
  requestForQuote: boolean;
}

export interface VehiclePricingPublicQuote {
  categoryId: string;
  category: VehiclePricingPublicQuoteCategory;
  priceBreakdown: VehiclePricingPublicQuotePriceBreakdown;
  passengers: number;
  luggage: number;
}
