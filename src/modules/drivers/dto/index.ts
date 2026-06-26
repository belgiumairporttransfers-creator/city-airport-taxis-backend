import type {
  DriverApplicationResponse,
  DriverApplicationStatusResponse,
  DriverDocuments,
  DriverReviewResponse,
  IDriverApplication,
} from "@/modules/drivers/types/driver.types";

type DriverApplicationLike =
  | IDriverApplication
  | (Record<string, unknown> & { _id: unknown });

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

const toRecord = (application: DriverApplicationLike): Record<string, unknown> => {
  if (
    typeof application === "object" &&
    application !== null &&
    typeof (application as IDriverApplication).toObject === "function"
  ) {
    return (application as IDriverApplication).toObject() as Record<string, unknown>;
  }

  return application as Record<string, unknown>;
};

const toDriverReviewsResponse = (reviews: unknown): DriverReviewResponse[] => {
  if (!Array.isArray(reviews)) {
    return [];
  }

  return reviews
    .map((review) => {
      const record = review as Record<string, unknown>;

      return {
        id: toIdString(record._id) ?? "",
        passengerName: record.passengerName as string,
        rating: Number(record.rating ?? 0),
        comment: record.comment as string,
        createdAt: toIsoString(record.createdAt) ?? "",
      };
    })
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
};

export const toDriverApplicationResponse = (
  application: DriverApplicationLike,
  options?: { includeReviews?: boolean }
): DriverApplicationResponse => {
  const record = toRecord(application);

  return {
    id: toIdString(record._id) ?? "",
    userId: toIdString(record.userId),
    applicationNumber: record.applicationNumber as string,
    status: record.status as DriverApplicationResponse["status"],
    operatingCountry: record.operatingCountry as string,
    operatingCity: record.operatingCity as string,
    firstName: record.firstName as string,
    lastName: record.lastName as string,
    email: record.email as string,
    phone: record.phone as string,
    homeAddress: record.homeAddress as string,
    carType: record.carType as string,
    carColor: record.carColor as string,
    licensePlate: record.licensePlate as string,
    carYearModel: record.carYearModel as string,
    yearsOfExperience: Number(record.yearsOfExperience ?? 0),
    shiftType: record.shiftType as DriverApplicationResponse["shiftType"],
    availableFrom: record.availableFrom as string,
    availableTo: record.availableTo as string,
    profilePhoto: (record.profilePhoto as string | undefined) ?? "",
    about: (record.about as string | undefined) ?? "",
    skills: Array.isArray(record.skills) ? (record.skills as string[]) : [],
    reviews: options?.includeReviews === false ? [] : toDriverReviewsResponse(record.reviews),
    documents: record.documents as DriverDocuments,
    reviewNotes: record.reviewNotes as string | undefined,
    reviewedBy: toIdString(record.reviewedBy),
    reviewedAt: toIsoString(record.reviewedAt),
    approvedAt: toIsoString(record.approvedAt),
    rejectedAt: toIsoString(record.rejectedAt),
    createdAt: toIsoString(record.createdAt) ?? "",
    updatedAt: toIsoString(record.updatedAt) ?? "",
  };
};

export const toDriverApplicationStatusResponse = (
  application: DriverApplicationLike
): DriverApplicationStatusResponse => {
  const record = toRecord(application);
  const status = record.status as DriverApplicationStatusResponse["status"];

  const response: DriverApplicationStatusResponse = {
    applicationNumber: record.applicationNumber as string,
    status,
    updatedAt: toIsoString(record.updatedAt) ?? "",
  };

  if (status === "changes_requested" && record.reviewNotes) {
    response.reviewNotes = record.reviewNotes as string;
  }

  return response;
};
