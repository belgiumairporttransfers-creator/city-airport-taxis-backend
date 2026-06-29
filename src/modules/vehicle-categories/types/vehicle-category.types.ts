import type { Document, Types } from "mongoose";

export const VEHICLE_CATEGORY_STATUSES = ["active", "inactive"] as const;
export type VehicleCategoryStatus = (typeof VEHICLE_CATEGORY_STATUSES)[number];

export interface IVehicleCategory extends Document {
  name: string;
  slug: string;
  description?: string;
  image?: string;
  passengerCapacity?: number;
  luggageCapacity?: number;
  sortOrder: number;
  status: VehicleCategoryStatus;
  isDefault: boolean;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateVehicleCategoryData {
  name: string;
  slug?: string;
  description?: string;
  image?: string;
  passengerCapacity?: number;
  luggageCapacity?: number;
  sortOrder?: number;
  status?: VehicleCategoryStatus;
  isDefault?: boolean;
}

export interface UpdateVehicleCategoryData {
  name?: string;
  slug?: string;
  description?: string;
  image?: string;
  passengerCapacity?: number;
  luggageCapacity?: number;
  sortOrder?: number;
  status?: VehicleCategoryStatus;
  isDefault?: boolean;
}

export interface GetVehicleCategoriesQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: VehicleCategoryStatus;
  sort?: string;
}

export interface VehicleCategoryResponse {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  passengerCapacity?: number;
  luggageCapacity?: number;
  sortOrder: number;
  status: VehicleCategoryStatus;
  isDefault: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleCategoryListResponse {
  items: VehicleCategoryResponse[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface VehicleCategoryPublicResponse {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  passengerCapacity: number;
  luggageCapacity: number;
}

export interface VehicleCategoryPublicDetailResponse extends VehicleCategoryPublicResponse {
  hasActivePricing: boolean;
  activePricingSlabCount: number;
  vehicleCount: number;
}
