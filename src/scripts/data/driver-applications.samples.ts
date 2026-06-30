import {
  DRIVER_DOCUMENT_FIELDS,
  type DriverDocuments,
  type DriverReview,
  type DriverShiftType,
  type DriverStatus,
} from "@/modules/drivers/types/driver.types";

export type SampleDriver = {
  applicationNumber: string;
  status: DriverStatus;
  operatingCountry: string;
  operatingCity: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  homeAddress: string;
  carType: string;
  carColor: string;
  licensePlate: string;
  carYearModel: string;
  yearsOfExperience: number;
  shiftType: DriverShiftType;
  availableFrom: string;
  availableTo: string;
  about: string;
  skills: string[];
  reviews: DriverReview[];
  profilePhoto: string;
  documents: DriverDocuments;
  reviewNotes?: string;
  reviewedAt?: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
};

export const DRIVER_SEED_COUNT = 1;

const buildDocuments = (slug: string): DriverDocuments =>
  Object.fromEntries(
    DRIVER_DOCUMENT_FIELDS.map((field, index) => [
      field,
      `https://res.cloudinary.com/city-airport-taxis/image/upload/v1/driver-applications/${slug}/${field}-${index + 1}.pdf`,
    ])
  ) as DriverDocuments;

export const sampleDrivers: SampleDriver[] = [
  {
    applicationNumber: "DRV-0001",
    status: "pending",
    operatingCountry: "Netherlands",
    operatingCity: "Amsterdam",
    firstName: "Workspace",
    lastName: "Test",
    email: "testingworkspacex@gmail.com",
    phone: "+31612345678",
    homeAddress: "1 Test Street, Amsterdam",
    carType: "Toyota Prius",
    carColor: "Silver",
    licensePlate: "TE-ST-001",
    carYearModel: "2022",
    yearsOfExperience: 5,
    shiftType: "both",
    availableFrom: "06:00",
    availableTo: "22:00",
    documents: buildDocuments("workspace-test-driver"),
    profilePhoto:
      "https://ui-avatars.com/api/?name=Workspace+Test&size=256&background=0D8ABC&color=fff&bold=true",
    reviews: [],
    about:
      "Professional chauffeur based in Amsterdam, available for airport transfers and city rides.",
    skills: ["Airport Transfers", "Customer Service", "Dutch & English"],
  },
];
