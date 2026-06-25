import type { HydratedDocument, Types } from "mongoose";

export const VEHICLE_STATUSES = ["active", "maintenance", "inactive"] as const;
export type VehicleStatus = (typeof VEHICLE_STATUSES)[number];

export interface IVehicle {
  _id: Types.ObjectId;
  categoryId: Types.ObjectId;
  registrationNumber: string;
  make: string;
  model: string;
  year?: number;
  color?: string;
  passengerCapacity: number;
  luggageCapacity: number;
  status: VehicleStatus;
  features: string[];
  image?: string;
  notes?: string;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type IVehicleDocument = HydratedDocument<IVehicle>;

export interface CreateVehicleData {
  categoryId: string;
  registrationNumber: string;
  make: string;
  model: string;
  year?: number;
  color?: string;
  passengerCapacity: number;
  luggageCapacity: number;
  status?: VehicleStatus;
  features?: string[];
  image?: string;
  notes?: string;
}

export interface UpdateVehicleData {
  categoryId?: string;
  registrationNumber?: string;
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  passengerCapacity?: number;
  luggageCapacity?: number;
  status?: VehicleStatus;
  features?: string[];
  image?: string;
  notes?: string;
}

export interface GetVehiclesQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: VehicleStatus;
  categoryId?: string;
  sort?: string;
}

export interface VehicleResponse {
  _id: string;
  categoryId: string;
  registrationNumber: string;
  make: string;
  model: string;
  year?: number;
  color?: string;
  passengerCapacity: number;
  luggageCapacity: number;
  status: VehicleStatus;
  features: string[];
  image?: string;
  notes?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleListResponse {
  items: VehicleResponse[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
