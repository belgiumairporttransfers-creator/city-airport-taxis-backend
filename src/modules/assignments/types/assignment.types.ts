import type { Document, Types } from "mongoose";

export const ASSIGNMENT_STATUSES = [
  "pending",
  "accepted",
  "rejected",
  "expired",
  "cancelled",
  "completed",
] as const;

export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export const ACTIVE_ASSIGNMENT_STATUSES = ["pending", "accepted"] as const;
export type ActiveAssignmentStatus = (typeof ACTIVE_ASSIGNMENT_STATUSES)[number];

export interface IAssignment extends Document {
  assignmentNumber: string;
  bookingId: Types.ObjectId;
  bookingNumber: string;
  driverId: Types.ObjectId;
  driverUserId: Types.ObjectId;
  assignedBy: Types.ObjectId;
  status: AssignmentStatus;
  assignedAt: Date;
  acceptedAt?: Date;
  rejectedAt?: Date;
  expiredAt?: Date;
  completedAt?: Date;
  rejectReason?: string;
  adminNotes?: string;
  expiresAt?: Date;
  chatConversationId?: Types.ObjectId | null;
  callSessionId?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAssignmentData {
  bookingId: string;
  driverId: string;
  adminNotes?: string;
}

export interface RejectAssignmentData {
  reason: string;
}

export interface GetAssignmentsQuery {
  page?: number;
  limit?: number;
  status?: AssignmentStatus;
  driver?: string;
  booking?: string;
  search?: string;
  sort?: string;
}

export interface GetDriverAssignmentsQuery {
  page?: number;
  limit?: number;
  status?: AssignmentStatus;
  scope?: "today" | "upcoming" | "awaiting" | "accepted" | "completed" | "cancelled";
  sort?: string;
}
