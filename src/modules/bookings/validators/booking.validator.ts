import Joi from "joi";
import mongoose from "mongoose";
import {
  BOOKING_PAYMENT_METHODS,
  BOOKING_STATUSES,
} from "../types/booking.types";
import { BOOKING_TRIP_CATEGORIES } from "@/modules/vehicle-pricing/types/vehicle-pricing.types";
import { PAYMENT_STATUSES } from "@/modules/payments/types/payment.types";

const timeSchema = Joi.string()
  .trim()
  .pattern(/^([01]\d|2[0-3]):[0-5]\d$/)
  .messages({
    "string.pattern.base": "Time must be in HH:mm 24-hour format",
  });

const dateSchema = Joi.string()
  .trim()
  .pattern(/^\d{4}-\d{2}-\d{2}$/)
  .messages({
    "string.pattern.base": "Date must be in YYYY-MM-DD format",
  });

const createBookingBodySchema = {
  category: Joi.string()
    .valid(...BOOKING_TRIP_CATEGORIES)
    .required(),
  step1: Joi.object({
    pickupAddress: Joi.string().trim().min(3).max(500).required(),
    deliveryAddress: Joi.string().trim().min(3).max(500).required(),
    pickupDate: dateSchema.required(),
    pickupTime: timeSchema.required(),
    passengers: Joi.number().integer().min(1).max(20).required(),
    returnDate: dateSchema.optional(),
    returnTime: timeSchema.optional(),
  }).required(),
  routeData: Joi.object({
    distance: Joi.number().min(0).required(),
    durationMinutes: Joi.number().min(0).optional(),
    estTime: Joi.string().trim().allow("", null).optional(),
    isAirportSelected: Joi.boolean().optional(),
  })
    .allow(null)
    .optional(),
  step2: Joi.object({
    categoryId: Joi.string().hex().length(24).required(),
    category: Joi.object({
      name: Joi.string().trim().min(1).max(120).required(),
      image: Joi.string().trim().uri().allow("", null).optional(),
      vehicles: Joi.array().items(Joi.string().trim()).optional(),
    }).required(),
    priceBreakdown: Joi.object({
      totalPrice: Joi.number().min(0).required(),
    }).required(),
    passengers: Joi.number().integer().min(1).max(20).required(),
    luggage: Joi.number().integer().min(0).max(20).required(),
  }).required(),
  step3: Joi.object({
    firstName: Joi.string().trim().min(1).max(80).required(),
    lastName: Joi.string().trim().min(1).max(80).required(),
    phone: Joi.string().trim().min(5).max(30).required(),
    email: Joi.string().trim().email().required(),
    isAirportPickup: Joi.boolean().required(),
    flightNumber: Joi.when("isAirportPickup", {
      is: true,
      then: Joi.string().trim().min(1).max(20).required(),
      otherwise: Joi.string().trim().allow("", null).optional(),
    }),
    notes: Joi.string().trim().allow("", null).max(2000).optional(),
    handLuggage: Joi.number().integer().min(0).max(20).required(),
    smallCheckedCase: Joi.number().integer().min(0).max(20).required(),
    largeCheckedCase: Joi.number().integer().min(0).max(20).required(),
  }).required(),
  pricing: Joi.object({
    total: Joi.number().min(0).required(),
    breakdown: Joi.object({
      totalVehicleFare: Joi.number().min(0).optional(),
      airportPickupPrice: Joi.number().min(0).optional(),
    }).optional(),
  }).required(),
};

export const createBookingSchema = Joi.object(createBookingBodySchema);

export const getDriverBookingsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  search: Joi.string().trim().allow("").optional(),
  scope: Joi.string().valid("accepted", "completed", "all").optional(),
  sort: Joi.string().trim().optional(),
});

export const getBookingsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  search: Joi.string().trim().allow("").optional(),
  status: Joi.string()
    .valid(...BOOKING_STATUSES)
    .optional(),
  paymentStatus: Joi.string()
    .valid(...PAYMENT_STATUSES)
    .optional(),
  paymentMethod: Joi.string()
    .valid(...BOOKING_PAYMENT_METHODS)
    .optional(),
  bookingDate: dateSchema.optional(),
  pickupDate: dateSchema.optional(),
  vehicleCategory: Joi.string().hex().length(24).optional(),
  sort: Joi.string().trim().optional(),
});

export const updateBookingSchema = Joi.object({
  pickupDate: dateSchema.optional(),
  pickupTime: timeSchema.optional(),
  notes: Joi.string().trim().allow("", null).max(2000).optional(),
  flightNumber: Joi.string().trim().allow("", null).max(20).optional(),
  passengers: Joi.number().integer().min(1).max(20).optional(),
  luggage: Joi.number().integer().min(0).max(20).optional(),
  handLuggage: Joi.number().integer().min(0).max(20).optional(),
  smallCheckedCase: Joi.number().integer().min(0).max(20).optional(),
  largeCheckedCase: Joi.number().integer().min(0).max(20).optional(),
  paymentStatus: Joi.string()
    .valid(...PAYMENT_STATUSES)
    .optional(),
  status: Joi.string()
    .valid(...BOOKING_STATUSES)
    .optional(),
  adminNote: Joi.string().trim().min(1).max(5000).optional(),
})
  .min(1)
  .messages({
    "object.min": "At least one field must be provided for update",
  });

export const cancelBookingSchema = Joi.object({
  reason: Joi.string().trim().allow("", null).max(1000).optional(),
});

export const bulkDeleteBookingsSchema = Joi.object({
  ids: Joi.array()
    .items(
      Joi.string()
        .custom((value, helpers) => {
          if (!mongoose.Types.ObjectId.isValid(value)) {
            return helpers.error("any.invalid");
          }
          return value;
        })
        .messages({ "any.invalid": "Invalid booking id" })
    )
    .min(1)
    .required()
    .messages({
      "array.min": "At least one booking id is required",
      "any.required": "Booking ids are required",
    }),
});
