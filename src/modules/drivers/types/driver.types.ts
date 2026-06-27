import type { Document, Types } from "mongoose";

export const DRIVER_APPLICATION_STATUSES = [
  "pending",
  "under_review",
  "changes_requested",
  "approved",
  "rejected",
  "suspended",
] as const;

export type DriverApplicationStatus = (typeof DRIVER_APPLICATION_STATUSES)[number];

export const DRIVER_EDITABLE_STATUSES = ["pending", "under_review", "changes_requested"] as const;

export const DRIVER_PORTAL_EDITABLE_STATUSES = [
  "pending",
  "under_review",
  "changes_requested",
  "approved",
] as const;

export const DRIVER_UPLOAD_ALLOWED_STATUSES = [
  "pending",
  "under_review",
  "changes_requested",
] as const;

export const DRIVER_ACTIVE_STATUSES = [
  "pending",
  "under_review",
  "changes_requested",
  "approved",
  "suspended",
] as const;

export const DRIVER_SHIFT_TYPES = ["day", "night", "both"] as const;
export type DriverShiftType = (typeof DRIVER_SHIFT_TYPES)[number];

export const DRIVER_DOCUMENT_FIELDS = [
  "chauffeurPassFront",
  "chauffeurPassBack",
  "kiwaPermit",
  "driverLicenseFront",
  "driverLicenseBack",
  "carCard",
  "carFrontView",
  "carBackView",
  "carLeftView",
  "carRightView",
  "carInsideView",
  "licensePlateView",
  "taxiInsurancePolicy",
  "kvkUittreksel",
  "bankCardCopy",
] as const;

export type DriverDocumentField = (typeof DRIVER_DOCUMENT_FIELDS)[number];

export type DriverDocuments = Record<DriverDocumentField, string>;

export interface DriverReview {
  id?: string;
  passengerName: string;
  rating: number;
  comment: string;
  createdAt: Date;
}

export interface IDriverApplication extends Document {
  userId?: Types.ObjectId;
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
  profilePhoto: string;
  about: string;
  skills: string[];
  reviews: DriverReview[];
  documents: DriverDocuments;
  reviewNotes?: string;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubmitDriverApplicationData {
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
  profilePhoto?: string;
  documents: DriverDocuments;
}

export interface CreateDriverApplicationData {
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
  profilePhoto?: string;
  about?: string;
  skills?: string[];
  documents: DriverDocuments;
}

export interface ResubmitDriverApplicationData {
  email: string;
  documents?: Partial<DriverDocuments>;
  operatingCountry?: string;
  operatingCity?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  homeAddress?: string;
  carType?: string;
  carColor?: string;
  licensePlate?: string;
  carYearModel?: string;
  yearsOfExperience?: number;
  shiftType?: DriverShiftType;
  availableFrom?: string;
  availableTo?: string;
  profilePhoto?: string;
}

export interface UpdateDriverApplicationData {
  operatingCountry?: string;
  operatingCity?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  homeAddress?: string;
  carType?: string;
  carColor?: string;
  licensePlate?: string;
  carYearModel?: string;
  yearsOfExperience?: number;
  shiftType?: DriverShiftType;
  availableFrom?: string;
  availableTo?: string;
  profilePhoto?: string;
  about?: string;
  skills?: string[];
  documents?: Partial<DriverDocuments>;
  reviewNotes?: string;
}

export interface GetDriverApplicationsQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: DriverApplicationStatus;
  sort?: string;
}

export interface DriverApplicationResponse {
  id: string;
  userId?: string;
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
  profilePhoto: string;
  about: string;
  skills: string[];
  reviews: DriverReviewResponse[];
  documents: DriverDocuments;
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DriverReviewResponse {
  id: string;
  passengerName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface DriverApplicationStatusResponse {
  applicationNumber: string;
  status: DriverApplicationStatus;
  reviewNotes?: string;
  updatedAt: string;
}

export interface DriverApplicationListResponse {
  items: DriverApplicationResponse[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DriverApplicationStatsResponse {
  pending: number;
  underReview: number;
  changesRequested: number;
  approved: number;
  rejected: number;
  suspended: number;
  total: number;
}

export interface UploadDriverDocumentData {
  applicationNumber: string;
  email: string;
}
