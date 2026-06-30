import type { Document, Types } from "mongoose";

export const DRIVER_STATUSES = [
  "pending",
  "under_review",
  "changes_requested",
  "approved",
  "rejected",
  "suspended",
] as const;

export type DriverStatus = (typeof DRIVER_STATUSES)[number];

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

export interface IDriver extends Document {
  userId?: Types.ObjectId;
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

export interface SubmitDriverData {
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

export interface CreateDriverData {
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

export interface ResubmitDriverData {
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

export interface UpdateDriverData {
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

export interface GetDriversQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: DriverStatus;
  sort?: string;
}

export interface DriverResponse {
  id: string;
  userId?: string;
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

export interface DriverStatusResponse {
  applicationNumber: string;
  status: DriverStatus;
  reviewNotes?: string;
  updatedAt: string;
}

export interface DriverListResponse {
  items: DriverResponse[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DriverStatsResponse {
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
