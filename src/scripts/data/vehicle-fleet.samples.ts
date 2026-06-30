import type { CreateVehicleCategoryData } from "@/modules/vehicle-categories/types/vehicle-category.types";
import type { CreateVehicleData } from "@/modules/vehicles/types/vehicle.types";

export type SampleVehicleCategory = CreateVehicleCategoryData & {
  slug: string;
};

export type SampleVehicle = Omit<CreateVehicleData, "categoryId"> & {
  categorySlug: string;
};

export const sampleVehicleCategories: SampleVehicleCategory[] = [
  {
    name: "Economy",
    slug: "economy",
    description: "Affordable everyday transfers in comfortable saloon vehicles.",
    passengerCapacity: 4,
    luggageCapacity: 3,
    sortOrder: 1,
    status: "active",
    isDefault: true,
  },
];

export const sampleVehicles: SampleVehicle[] = [
  {
    categorySlug: "economy",
    registrationNumber: "SK12 OCT",
    make: "Skoda",
    model: "Octavia",
    year: 2022,
    color: "White",
    passengerCapacity: 4,
    luggageCapacity: 3,
    status: "active",
    features: ["Air conditioning", "USB charging", "Flight tracking"],
    notes: "Primary economy vehicle for airport and city transfers.",
  },
  {
    categorySlug: "economy",
    registrationNumber: "TY34 PRS",
    make: "Toyota",
    model: "Prius",
    year: 2023,
    color: "Silver",
    passengerCapacity: 4,
    luggageCapacity: 3,
    status: "active",
    features: ["Air conditioning", "Eco driving", "Child seat available"],
    notes: "Hybrid economy vehicle for fuel-efficient transfers.",
  },
];
