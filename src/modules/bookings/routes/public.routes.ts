import { Router, type IRouter } from "express";
import bookingPublicController from "../controllers/booking-public.controller";
import { validateParams, validateRequest } from "@/middleware/validate";
import { createBookingSchema } from "../validators/booking.validator";
import { idParamSchema } from "@/shared/validators/object-id.schema";
import { bookingCreateLimiter, bookingStatusLimiter } from "@/middleware/rateLimiters";

const publicBookingRoutes: IRouter = Router();

publicBookingRoutes.post(
  "/",
  bookingCreateLimiter,
  validateRequest(createBookingSchema),
  bookingPublicController.create
);

publicBookingRoutes.get(
  "/:id",
  bookingStatusLimiter,
  validateParams(idParamSchema),
  bookingPublicController.getById
);

export default publicBookingRoutes;
