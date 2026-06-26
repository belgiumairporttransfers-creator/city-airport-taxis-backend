import {
  DRIVER_DOCUMENT_FIELDS,
  type DriverApplicationStatus,
  type DriverDocuments,
  type DriverReview,
  type DriverShiftType,
} from "@/modules/drivers/types/driver.types";
import { buildDriverReviews } from "./driver-reviews.samples";

export type SampleDriverApplication = {
  applicationNumber: string;
  status: DriverApplicationStatus;
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

/** Default 50 — override with DRIVER_SEED_COUNT env (max 500). */
export const DRIVER_SEED_COUNT = Math.min(
  Math.max(Number(process.env.DRIVER_SEED_COUNT) || 50, 50),
  500
);

const STATUSES: DriverApplicationStatus[] = [
  "pending",
  "under_review",
  "changes_requested",
  "approved",
  "rejected",
  "suspended",
];

const CITIES = [
  "Amsterdam",
  "Rotterdam",
  "The Hague",
  "Utrecht",
  "Eindhoven",
  "Groningen",
  "Maastricht",
  "Haarlem",
  "Leiden",
  "Breda",
  "Nijmegen",
  "Arnhem",
  "Tilburg",
  "Delft",
  "Zwolle",
];

const FIRST_NAMES = [
  "Jan",
  "Fatima",
  "Pieter",
  "Sophie",
  "Mohammed",
  "Lucas",
  "Emma",
  "Ahmed",
  "Lisa",
  "Thomas",
  "Noah",
  "Mila",
  "Daan",
  "Sara",
  "Finn",
  "Eva",
  "Sem",
  "Nora",
  "Luuk",
  "Yara",
  "Bram",
  "Zoe",
  "Mees",
  "Lotte",
  "Jesse",
  "Anna",
  "Ruben",
  "Isa",
  "Thijs",
  "Fleur",
  "Omar",
  "Layla",
  "Hassan",
  "Aisha",
  "Mark",
  "Laura",
  "Kevin",
  "Julia",
  "Dennis",
  "Kim",
];

const LAST_NAMES = [
  "de Vries",
  "El Amrani",
  "Bakker",
  "Jansen",
  "Hassan",
  "van den Berg",
  "Smit",
  "Yilmaz",
  "Mulder",
  "Visser",
  "de Jong",
  "Peters",
  "Meijer",
  "Bos",
  "Vos",
  "Hendriks",
  "Dijkstra",
  "Kok",
  "Schouten",
  "Dekker",
  "van Dijk",
  "Brouwer",
  "Koster",
  "Willems",
  "Postma",
  "Martens",
  "Vermeulen",
  "Hoekstra",
  "Groen",
  "Prins",
];

const CAR_TYPES = [
  "Mercedes-Benz E-Class",
  "Toyota Prius",
  "Volkswagen Passat",
  "BMW 5 Series",
  "Skoda Octavia",
  "Mercedes-Benz Vito",
  "Tesla Model 3",
  "Audi A6",
  "Volvo XC90",
  "Mercedes-Benz S-Class",
  "Hyundai Ioniq 5",
  "Kia EV6",
  "Peugeot 508",
  "Ford Mondeo",
  "Lexus ES",
];

const CAR_COLORS = [
  "Black",
  "Silver",
  "Blue",
  "Graphite",
  "White",
  "Pearl White",
  "Navy",
  "Grey",
  "Midnight Blue",
  "Champagne",
];

const SKILL_POOL = [
  "Airport Transfers",
  "Executive Travel",
  "Customer Service",
  "Dutch & English",
  "Night Shifts",
  "Luxury Chauffeur",
  "VIP Service",
  "Route Planning",
  "Eco-Friendly Driving",
  "Family Transfers",
  "Cross-Border Routes",
  "Corporate Travel",
  "Long-Distance Routes",
  "Group Transfers",
];

const SHIFT_TYPES: DriverShiftType[] = ["day", "night", "both"];

const AVATAR_COLORS = [
  "0D8ABC",
  "6366F1",
  "DC2626",
  "059669",
  "D97706",
  "7C3AED",
  "DB2777",
  "0891B2",
  "4F46E5",
  "BE123C",
];

const reviewedAt = new Date("2026-06-20T10:30:00.000Z");
const approvedAt = new Date("2026-06-21T14:00:00.000Z");
const rejectedAt = new Date("2026-06-19T16:45:00.000Z");

const buildDocuments = (slug: string): DriverDocuments =>
  Object.fromEntries(
    DRIVER_DOCUMENT_FIELDS.map((field, index) => [
      field,
      `https://res.cloudinary.com/city-airport-taxis/image/upload/v1/driver-applications/${slug}/${field}-${index + 1}.pdf`,
    ])
  ) as DriverDocuments;

const buildProfilePhoto = (firstName: string, lastName: string, index: number): string => {
  const name = encodeURIComponent(`${firstName} ${lastName}`);
  const bg = AVATAR_COLORS[index % AVATAR_COLORS.length];
  return `https://ui-avatars.com/api/?name=${name}&size=256&background=${bg}&color=fff&bold=true`;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const buildGmail = (firstName: string, lastName: string, index: number): string => {
  const local = `${slugify(firstName)}.${slugify(lastName).replace(/-/g, "")}.driver${String(index).padStart(3, "0")}`;
  return `${local}@gmail.com`;
};

const buildLicensePlate = (index: number): string => {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const pick = (offset: number) => letters[(index + offset) % letters.length];
  const digits = String(100 + (index % 900)).padStart(3, "0");
  return `${pick(0)}${pick(1)}-${digits}-${pick(2)}${pick(3)}`;
};

const buildProfile = (
  firstName: string,
  city: string,
  years: number,
  carType: string,
  skills: string[]
) => ({
  about: `Hi, I'm ${firstName}, a professional chauffeur based in ${city} with ${years} years of experience. I specialise in reliable airport transfers, executive travel, and premium customer service across the Netherlands.\n\nI operate a ${carType} and focus on punctuality, discretion, and a smooth journey for every passenger.`,
  skills,
});

const pickSkills = (index: number): string[] => {
  const count = 4 + (index % 3);
  const skills: string[] = [];

  for (let i = 0; i < count; i += 1) {
    const skill = SKILL_POOL[(index + i * 3) % SKILL_POOL.length];
    if (!skills.includes(skill)) {
      skills.push(skill);
    }
  }

  return skills;
};

const reviewCountForIndex = (index: number): number => {
  const counts = [12, 0, 8, 30, 4, 15, 0, 22, 6, 18];
  return counts[index % counts.length];
};

const statusMeta = (
  status: DriverApplicationStatus,
  index: number
): Pick<
  SampleDriverApplication,
  "reviewNotes" | "reviewedAt" | "approvedAt" | "rejectedAt"
> => {
  if (status === "pending") {
    return {};
  }

  const base = { reviewedAt };

  switch (status) {
    case "changes_requested":
      return {
        ...base,
        reviewNotes:
          index % 2 === 0
            ? "Please upload a clearer photo of your driver license front side."
            : "Kiwa permit document is expired. Please upload the renewed permit.",
      };
    case "approved":
    case "suspended":
      return { ...base, approvedAt };
    case "rejected":
      return {
        ...base,
        rejectedAt,
        reviewNotes: "Application did not meet fleet requirements at this time.",
      };
    case "under_review":
      return base;
    default:
      return {};
  }
};

export const buildSampleDriverApplications = (
  count: number = DRIVER_SEED_COUNT
): SampleDriverApplication[] =>
  Array.from({ length: count }, (_, index) => {
    const sequence = index + 1;
    const firstName = FIRST_NAMES[index % FIRST_NAMES.length];
    const lastName = LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length];
    const city = CITIES[index % CITIES.length];
    const status = STATUSES[index % STATUSES.length];
    const yearsOfExperience = 2 + (index % 14);
    const carType = CAR_TYPES[index % CAR_TYPES.length];
    const shiftType = SHIFT_TYPES[index % SHIFT_TYPES.length];
    const slug = `${slugify(firstName)}-${slugify(lastName)}-${sequence}`;
    const availableFrom = shiftType === "night" ? "18:00" : "06:00";
    const availableTo = shiftType === "night" ? "06:00" : shiftType === "day" ? "18:00" : "22:00";

    const application: SampleDriverApplication = {
      applicationNumber: `DRV-${String(sequence).padStart(4, "0")}`,
      status,
      operatingCountry: "Netherlands",
      operatingCity: city,
      firstName,
      lastName,
      email: buildGmail(firstName, lastName, sequence),
      phone: `+316${String(12000000 + sequence).padStart(8, "0")}`,
      homeAddress: `${index + 1} Seed Street, ${city}`,
      carType,
      carColor: CAR_COLORS[index % CAR_COLORS.length],
      licensePlate: buildLicensePlate(sequence),
      carYearModel: String(2019 + (index % 6)),
      yearsOfExperience,
      shiftType,
      availableFrom,
      availableTo,
      documents: buildDocuments(slug),
      profilePhoto: buildProfilePhoto(firstName, lastName, index),
      reviews: buildDriverReviews(reviewCountForIndex(index), index),
      ...buildProfile(firstName, city, yearsOfExperience, carType, pickSkills(index)),
      ...statusMeta(status, index),
    };

    if (status === "suspended") {
      application.reviewNotes = "Suspended pending investigation of customer complaint.";
    }

    return application;
  });

export const sampleDriverApplications = buildSampleDriverApplications();
