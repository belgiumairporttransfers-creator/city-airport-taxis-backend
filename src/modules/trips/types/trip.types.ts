import type { TripPhase } from "../utils/trip-phase";

export const TRIP_EXECUTION_STATUSES = ["accepted"] as const;

export type TripExecutionStatus = (typeof TRIP_EXECUTION_STATUSES)[number];

export const TRIP_ACTIVE_PHASES = [
  "driver_arrived",
  "passenger_onboard",
  "trip_started",
] as const;

export type TripTransitionAction =
  | "arrived"
  | "passenger-onboard"
  | "start"
  | "complete";

export interface TripTransition {
  nextStatus: "accepted" | "complete";
  timelineEvent: string;
  auditEvent: string;
}

export interface GetAdminTripsQuery {
  page?: number;
  limit?: number;
  status?: TripPhase;
  driver?: string;
  date?: string;
  search?: string;
  sort?: string;
}

export interface DriverTripListResponse {
  today: unknown[];
  upcoming: unknown[];
  active: unknown[];
  completed: unknown[];
}
