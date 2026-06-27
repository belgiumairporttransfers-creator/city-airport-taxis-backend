import { Router, type IRouter } from "express";
import driverController from "../controllers/driver.controller";
import { validateParams, validateQuery, validateRequest } from "@/middleware/validate";
import {
  createDriverApplicationSchema,
  getDriverApplicationsQuerySchema,
  optionalReviewNotesSchema,
  reviewNotesSchema,
  updateDriverApplicationSchema,
} from "../validators/driver.validator";
import { idParamSchema } from "@/shared/validators/object-id.schema";

const adminDriverRoutes: IRouter = Router();

adminDriverRoutes.get("/stats", driverController.getStats);

adminDriverRoutes.get(
  "/",
  validateQuery(getDriverApplicationsQuerySchema),
  driverController.getAll
);

adminDriverRoutes.post(
  "/",
  validateRequest(createDriverApplicationSchema),
  driverController.create
);

adminDriverRoutes.get("/:id", validateParams(idParamSchema), driverController.getOne);

adminDriverRoutes.patch(
  "/:id",
  validateParams(idParamSchema),
  validateRequest(updateDriverApplicationSchema),
  driverController.update
);

adminDriverRoutes.post(
  "/:id/start-review",
  validateParams(idParamSchema),
  driverController.startReview
);

adminDriverRoutes.post(
  "/:id/request-changes",
  validateParams(idParamSchema),
  validateRequest(reviewNotesSchema),
  driverController.requestChanges
);

adminDriverRoutes.post("/:id/approve", validateParams(idParamSchema), driverController.approve);

adminDriverRoutes.post(
  "/:id/reject",
  validateParams(idParamSchema),
  validateRequest(reviewNotesSchema),
  driverController.reject
);

adminDriverRoutes.post(
  "/:id/suspend",
  validateParams(idParamSchema),
  validateRequest(optionalReviewNotesSchema),
  driverController.suspend
);

export default adminDriverRoutes;
