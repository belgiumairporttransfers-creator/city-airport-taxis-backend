import { Router, type IRouter } from "express";
import hourlyPricingController from "../controllers/hourly-pricing.controller";
import { validateParams, validateQuery, validateRequest } from "@/middleware/validate";
import {
  createHourlyPricingSchema,
  getHourlyPricingQuerySchema,
  updateHourlyPricingSchema,
} from "../validators/hourly-pricing.validator";
import { categoryIdParamSchema } from "../validators/vehicle-pricing.validator";
import { idParamSchema } from "@/shared/validators/object-id.schema";

const adminCategoryHourlyPricingRoutes: IRouter = Router({ mergeParams: true });

adminCategoryHourlyPricingRoutes.get(
  "/",
  validateParams(categoryIdParamSchema),
  hourlyPricingController.listByCategory
);
adminCategoryHourlyPricingRoutes.post(
  "/",
  validateParams(categoryIdParamSchema),
  validateRequest(createHourlyPricingSchema),
  hourlyPricingController.createForCategory
);

const adminHourlyPricingRoutes: IRouter = Router();

adminHourlyPricingRoutes.get(
  "/",
  validateQuery(getHourlyPricingQuerySchema),
  hourlyPricingController.getAll
);
adminHourlyPricingRoutes.get(
  "/:id",
  validateParams(idParamSchema),
  hourlyPricingController.getOne
);
adminHourlyPricingRoutes.patch(
  "/:id",
  validateParams(idParamSchema),
  validateRequest(updateHourlyPricingSchema),
  hourlyPricingController.update
);
adminHourlyPricingRoutes.delete(
  "/:id",
  validateParams(idParamSchema),
  hourlyPricingController.deleteOne
);

export { adminCategoryHourlyPricingRoutes, adminHourlyPricingRoutes };
