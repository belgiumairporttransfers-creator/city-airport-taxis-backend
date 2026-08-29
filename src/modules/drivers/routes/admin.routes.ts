import { Router, type IRouter } from "express";
import driverController from "../controllers/driver.controller";
import { validateParams, validateQuery, validateRequest } from "@/middleware/validate";
import {
  createDriverSchema,
  getDriversQuerySchema,
  optionalReviewNotesSchema,
  reviewNotesSchema,
  updateDriverSchema,
} from "../validators/driver.validator";
import { idParamSchema } from "@/shared/validators/object-id.schema";

const adminDriverRoutes: IRouter = Router();

adminDriverRoutes.get("/stats", driverController.getStats);

adminDriverRoutes.get(
  "/",
  validateQuery(getDriversQuerySchema),
  driverController.getAll
);

adminDriverRoutes.post(
  "/",
  validateRequest(createDriverSchema),
  driverController.create
);

adminDriverRoutes.get("/:id", validateParams(idParamSchema), driverController.getOne);

adminDriverRoutes.patch(
  "/:id",
  validateParams(idParamSchema),
  validateRequest(updateDriverSchema),
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

adminDriverRoutes.post(
  "/:id/reactivate",
  validateParams(idParamSchema),
  driverController.reactivate
);

adminDriverRoutes.delete(
  "/:id",
  validateParams(idParamSchema),
  driverController.deletePermanently
);

export default adminDriverRoutes;
