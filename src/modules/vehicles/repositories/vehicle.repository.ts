import { Vehicle } from "@/infrastructure/database/models/Vehicle";
import type {
  CreateVehicleData,
  GetVehiclesQuery,
  UpdateVehicleData,
} from "@/modules/vehicles/types/vehicle.types";
import APIFeature from "@/shared/utils/APIFeature";
import type { Document, Model } from "mongoose";

class VehicleRepository {
  create(data: CreateVehicleData & { createdBy?: string; updatedBy?: string; categoryId: string }) {
    return Vehicle.create(data);
  }

  findById(id: string) {
    return Vehicle.findById(id);
  }

  findByRegistrationNumber(registrationNumber: string) {
    return Vehicle.findOne({
      registrationNumber: registrationNumber.trim().toUpperCase(),
    });
  }

  findWithPagination(query: GetVehiclesQuery) {
    return new APIFeature(Vehicle as unknown as Model<Document>, query, {
      pagination: { defaultLimit: 20 },
      sort: {
        defaultSort: "-createdAt",
        allowedFields: [
          "createdAt",
          "updatedAt",
          "registrationNumber",
          "make",
          "model",
          "year",
          "status",
          "passengerCapacity",
        ],
      },
      search: {
        searchFields: ["registrationNumber", "make", "model"],
      },
      filterFields: ["status", "categoryId"],
      excludeFields: ["__v"],
      lean: true,
    }).execute();
  }

  updateById(id: string, data: UpdateVehicleData & { updatedBy?: string; categoryId?: string }) {
    return Vehicle.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  deleteById(id: string) {
    return Vehicle.findByIdAndDelete(id);
  }

  count() {
    return Vehicle.countDocuments();
  }

  countByCategoryId(categoryId: string) {
    return Vehicle.countDocuments({ categoryId });
  }

  findActive() {
    return Vehicle.find({ status: "active" })
      .sort({ make: 1, model: 1, registrationNumber: 1 })
      .lean();
  }

  findActiveByCategoryId(categoryId: string) {
    return Vehicle.find({ categoryId, status: "active" })
      .sort({ make: 1, model: 1, registrationNumber: 1 })
      .lean();
  }

  countActiveByCategoryId(categoryId: string) {
    return Vehicle.countDocuments({ categoryId, status: "active" });
  }
}

export default new VehicleRepository();
