import type { HydratedDocument, Types } from "mongoose";
import type { VehiclePricingStatus } from "./vehicle-pricing.types";

export const HOURLY_SERVICE_TYPES = ["hourly"] as const;
export type HourlyServiceType = (typeof HOURLY_SERVICE_TYPES)[number];

export interface IHourlyPricing {
  _id: Types.ObjectId;
  categoryId: Types.ObjectId;
  serviceType: HourlyServiceType;
  duration: number;
  price: number;
  includedDistance: number;
  extraDistancePrice: number;
  status: VehiclePricingStatus;
  sortOrder: number;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type IHourlyPricingDocument = HydratedDocument<IHourlyPricing>;

export interface CreateHourlyPricingData {
  categoryId: string;
  serviceType?: HourlyServiceType;
  duration: number;
  price: number;
  includedDistance: number;
  extraDistancePrice: number;
  status?: VehiclePricingStatus;
  sortOrder?: number;
}

export interface UpdateHourlyPricingData {
  serviceType?: HourlyServiceType;
  duration?: number;
  price?: number;
  includedDistance?: number;
  extraDistancePrice?: number;
  status?: VehiclePricingStatus;
  sortOrder?: number;
}

export interface GetHourlyPricingQuery {
  page?: number;
  limit?: number;
  categoryId?: string;
  status?: VehiclePricingStatus;
  sort?: string;
  search?: string;
}

export interface HourlyPricingResponse {
  _id: string;
  categoryId: string;
  serviceType: HourlyServiceType;
  duration: number;
  price: number;
  includedDistance: number;
  extraDistancePrice: number;
  status: VehiclePricingStatus;
  sortOrder: number;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}
