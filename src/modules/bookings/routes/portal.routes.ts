import { Router, type IRouter } from "express";
import { protectUser } from "@/middleware/auth";
import bookingPortalController from "../controllers/booking-portal.controller";
import { validateParams, validateQuery } from "@/middleware/validate";
import { idParamSchema } from "@/shared/validators/object-id.schema";
import { getDriverBookingsQuerySchema } from "../validators/booking.validator";

const portalBookingRoutes: IRouter = Router();

portalBookingRoutes.use(protectUser);

portalBookingRoutes.get(
  "/bookings",
  validateQuery(getDriverBookingsQuerySchema),
  bookingPortalController.getAll
);

portalBookingRoutes.get(
  "/bookings/:id",
  validateParams(idParamSchema),
  bookingPortalController.getOne
);

portalBookingRoutes.post(
  "/bookings/:id/accept",
  validateParams(idParamSchema),
  bookingPortalController.accept
);

export default portalBookingRoutes;
