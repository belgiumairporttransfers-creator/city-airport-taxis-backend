import { Schema, model } from "mongoose";
import {
  BOOKING_PAYMENT_METHODS,
  BOOKING_STATUSES,
  type IBooking,
} from "@/modules/bookings/types/booking.types";
import { BOOKING_TRIP_CATEGORIES } from "@/modules/vehicle-pricing/types/vehicle-pricing.types";

const customerSchema = new Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
  },
  { _id: false }
);

const routeSchema = new Schema(
  {
    pickupAddress: { type: String, required: true, trim: true },
    dropoffAddress: { type: String, required: true, trim: true },
    pickupDate: { type: String, required: true, trim: true },
    pickupTime: { type: String, required: true, trim: true },
    distance: { type: Number, required: true, min: 0 },
    durationMinutes: { type: Number, min: 0 },
    estimatedArrival: { type: String, trim: true },
    airportPickup: { type: Boolean, default: false },
  },
  { _id: false }
);

const vehicleSchema = new Schema(
  {
    categoryId: { type: Schema.Types.ObjectId, ref: "VehicleCategory", required: true },
    categoryName: { type: String, required: true, trim: true },
    passengers: { type: Number, required: true, min: 1 },
    luggage: { type: Number, required: true, min: 0 },
    handLuggage: { type: Number, default: 0, min: 0 },
    smallCheckedCase: { type: Number, default: 0, min: 0 },
    largeCheckedCase: { type: Number, default: 0, min: 0 },
    image: { type: String, trim: true },
  },
  { _id: false }
);

const flightSchema = new Schema(
  {
    required: { type: Boolean, default: false },
    flightNumber: { type: String, trim: true },
    terminal: { type: String, trim: true },
  },
  { _id: false }
);

const pricingSchema = new Schema(
  {
    vehicleFare: { type: Number, required: true, min: 0 },
    airportPickupFee: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const paymentInfoSchema = new Schema(
  {
    paymentMethod: { type: String, enum: BOOKING_PAYMENT_METHODS, required: true },
    paymentStatus: { type: String, required: true, trim: true },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment" },
  },
  { _id: false }
);

const driverSchema = new Schema(
  {
    driverId: { type: Schema.Types.ObjectId, ref: "Driver" },
    assignedAt: { type: Date },
    acceptedAt: { type: Date },
  },
  { _id: false }
);

const tripSchema = new Schema(
  {
    startedAt: { type: Date },
    completedAt: { type: Date },
    driverArrivedAt: { type: Date },
    passengerBoardedAt: { type: Date },
    actualPickupTime: { type: Date },
    actualDropoffTime: { type: Date },
  },
  { _id: false }
);

const timelineSchema = new Schema(
  {
    event: { type: String, required: true, trim: true },
    at: { type: Date, required: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const adminNoteSchema = new Schema(
  {
    adminId: { type: Schema.Types.ObjectId, ref: "Admin", required: true },
    message: { type: String, required: true, trim: true, maxlength: 5000 },
    createdAt: { type: Date, required: true, default: Date.now },
  },
  { _id: true }
);

const bookingSchema = new Schema<IBooking>(
  {
    bookingNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    status: {
      type: String,
      enum: BOOKING_STATUSES,
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: BOOKING_TRIP_CATEGORIES,
      required: true,
    },
    customer: { type: customerSchema, required: true },
    route: { type: routeSchema, required: true },
    vehicle: { type: vehicleSchema, required: true },
    flight: { type: flightSchema, required: true },
    pricing: { type: pricingSchema, required: true },
    payment: { type: paymentInfoSchema, required: true },
    driver: { type: driverSchema, default: () => ({}) },
    trip: { type: tripSchema, default: () => ({}) },
    timeline: { type: [timelineSchema], default: [] },
    notes: { type: String, trim: true },
    adminNotes: { type: [adminNoteSchema], default: [] },
    currentAssignmentId: { type: Schema.Types.ObjectId, ref: "Assignment", index: true },
    currentDriverId: { type: Schema.Types.ObjectId, ref: "Driver", index: true },
    assignmentStatus: { type: String, trim: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

bookingSchema.index({ bookingNumber: 1 }, { unique: true });
bookingSchema.index({ status: 1, createdAt: -1 });
bookingSchema.index({ "route.pickupDate": 1 });
bookingSchema.index({ "customer.email": 1 });
bookingSchema.index({ "payment.paymentStatus": 1 });
bookingSchema.index({ "payment.paymentMethod": 1 });
bookingSchema.index({ "vehicle.categoryId": 1 });
bookingSchema.index({ createdAt: -1 });

bookingSchema.pre("validate", function (next) {
  const booking = this as unknown as { isNew: boolean; bookingNumber?: string };

  if (!booking.isNew || booking.bookingNumber) {
    next();
    return;
  }

  const randomDigits = Math.floor(100000 + Math.random() * 900000).toString();
  booking.bookingNumber = `ODR-${randomDigits}`;
  next();
});

export const Booking = model<IBooking>("Booking", bookingSchema);
