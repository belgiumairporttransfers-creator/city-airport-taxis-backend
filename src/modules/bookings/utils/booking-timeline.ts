import type { BookingTimelineEntry, BookingTimelineEvent } from "@/modules/bookings/types/booking.types";

export const appendTimelineEntry = (
  timeline: BookingTimelineEntry[],
  event: BookingTimelineEvent | string,
  metadata?: Record<string, unknown>
): BookingTimelineEntry[] => [
  ...timeline,
  {
    event,
    at: new Date(),
    ...(metadata ? { metadata } : {}),
  },
];
