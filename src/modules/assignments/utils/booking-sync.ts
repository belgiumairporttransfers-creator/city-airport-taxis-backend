import { Types } from "mongoose";
import bookingRepository from "@/modules/bookings/repositories/booking.repository";
import { appendTimelineEntry } from "@/modules/bookings/utils/booking-timeline";
import type { IAssignment } from "@/modules/assignments/types/assignment.types";
import type { IBooking } from "@/modules/bookings/types/booking.types";

const toPlainBooking = (booking: IBooking) => {
  if (typeof booking.toObject === "function") {
    return booking.toObject() as IBooking;
  }

  return booking;
};

export const syncBookingOnAssign = async (
  booking: IBooking,
  assignment: IAssignment,
  driverId: Types.ObjectId
) => {
  const plain = toPlainBooking(booking);

  return bookingRepository.updateById(booking._id.toString(), {
    currentAssignmentId: assignment._id,
    currentDriverId: driverId,
    assignmentStatus: "pending",
    driver: {
      driverId,
      assignedAt: assignment.assignedAt,
    },
    timeline: appendTimelineEntry(plain.timeline ?? [], "DRIVER_ASSIGNED", {
      assignmentId: assignment._id.toString(),
      assignmentNumber: assignment.assignmentNumber,
      driverId: driverId.toString(),
    }),
  });
};

export const syncBookingOnAccept = async (booking: IBooking, assignment: IAssignment) => {
  const plain = toPlainBooking(booking);

  return bookingRepository.updateById(booking._id.toString(), {
    status: "accepted",
    assignmentStatus: "accepted",
    driver: {
      ...plain.driver,
      driverId: assignment.driverId,
      assignedAt: assignment.assignedAt,
      acceptedAt: assignment.acceptedAt ?? new Date(),
    },
    timeline: appendTimelineEntry(plain.timeline ?? [], "DRIVER_ACCEPTED", {
      assignmentId: assignment._id.toString(),
      assignmentNumber: assignment.assignmentNumber,
    }),
  });
};

export const syncBookingOnRelease = async (
  booking: IBooking,
  timelineEvent: string,
  metadata?: Record<string, unknown>
) => {
  const plain = toPlainBooking(booking);

  return bookingRepository.updateById(booking._id.toString(), {
    status: "confirmed",
    currentAssignmentId: null,
    currentDriverId: null,
    assignmentStatus: null,
    driver: {},
    timeline: appendTimelineEntry(plain.timeline ?? [], timelineEvent, metadata),
  });
};

export const syncBookingOnReassign = async (
  booking: IBooking,
  assignment: IAssignment,
  driverId: Types.ObjectId
) => {
  const plain = toPlainBooking(booking);

  return bookingRepository.updateById(booking._id.toString(), {
    currentAssignmentId: assignment._id,
    currentDriverId: driverId,
    assignmentStatus: "pending",
    driver: {
      driverId,
      assignedAt: assignment.assignedAt,
    },
    timeline: appendTimelineEntry(plain.timeline ?? [], "DRIVER_REASSIGNED", {
      assignmentId: assignment._id.toString(),
      assignmentNumber: assignment.assignmentNumber,
      driverId: driverId.toString(),
    }),
  });
};
