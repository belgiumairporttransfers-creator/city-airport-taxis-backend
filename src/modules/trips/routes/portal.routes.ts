import { Router, type IRouter } from "express";
import { protectUser } from "@/middleware/auth";
import tripPortalController from "../controllers/trip-portal.controller";
import { validateParams } from "@/middleware/validate";
import { bookingRefParamSchema } from "../validators/trip.validator";

const portalTripRoutes: IRouter = Router();

portalTripRoutes.use(protectUser);

portalTripRoutes.get("/trips", tripPortalController.getAll);

portalTripRoutes.get(
  "/trips/:bookingRef",
  validateParams(bookingRefParamSchema),
  tripPortalController.getOne
);

portalTripRoutes.post(
  "/trips/:bookingRef/arrived",
  validateParams(bookingRefParamSchema),
  tripPortalController.markArrived
);

portalTripRoutes.post(
  "/trips/:bookingRef/passenger-onboard",
  validateParams(bookingRefParamSchema),
  tripPortalController.markPassengerOnboard
);

portalTripRoutes.post(
  "/trips/:bookingRef/start",
  validateParams(bookingRefParamSchema),
  tripPortalController.start
);

portalTripRoutes.post(
  "/trips/:bookingRef/complete",
  validateParams(bookingRefParamSchema),
  tripPortalController.complete
);

export default portalTripRoutes;
