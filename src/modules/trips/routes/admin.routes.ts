import { Router, type IRouter } from "express";
import tripAdminController from "../controllers/trip-admin.controller";
import { validateParams, validateQuery } from "@/middleware/validate";
import { bookingNumberParamSchema, getAdminTripsQuerySchema } from "../validators/trip.validator";

const adminTripRoutes: IRouter = Router();

adminTripRoutes.get("/", validateQuery(getAdminTripsQuerySchema), tripAdminController.getAll);

adminTripRoutes.get(
  "/:bookingNumber",
  validateParams(bookingNumberParamSchema),
  tripAdminController.getOne
);

export default adminTripRoutes;
