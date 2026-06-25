import { Router, type IRouter } from "express";
import vehiclePricingController from "../controllers/vehicle-pricing.controller";
import { validateParams, validateQuery, validateRequest } from "@/middleware/validate";
import {
  categoryIdParamSchema,
  createVehiclePricingSchema,
  getPricingQuotesQuerySchema,
  getPricingQuerySchema,
  updateVehiclePricingSchema,
  validatePricingStructureSchema,
} from "../validators/vehicle-pricing.validator";
import { idParamSchema } from "@/shared/validators/object-id.schema";

const adminCategoryPricingRoutes: IRouter = Router({ mergeParams: true });

adminCategoryPricingRoutes.get(
  "/",
  validateParams(categoryIdParamSchema),
  vehiclePricingController.listByCategory
);
adminCategoryPricingRoutes.post(
  "/validate",
  validateParams(categoryIdParamSchema),
  validateRequest(validatePricingStructureSchema),
  vehiclePricingController.validateStructure
);
adminCategoryPricingRoutes.post(
  "/",
  validateParams(categoryIdParamSchema),
  validateRequest(createVehiclePricingSchema),
  vehiclePricingController.createForCategory
);

const adminVehiclePricingRoutes: IRouter = Router();

adminVehiclePricingRoutes.get(
  "/quotes",
  validateQuery(getPricingQuotesQuerySchema),
  vehiclePricingController.getQuotes
);
adminVehiclePricingRoutes.get(
  "/",
  validateQuery(getPricingQuerySchema),
  vehiclePricingController.getAll
);
adminVehiclePricingRoutes.get(
  "/:id",
  validateParams(idParamSchema),
  vehiclePricingController.getOne
);
adminVehiclePricingRoutes.patch(
  "/:id",
  validateParams(idParamSchema),
  validateRequest(updateVehiclePricingSchema),
  vehiclePricingController.update
);
adminVehiclePricingRoutes.delete(
  "/:id",
  validateParams(idParamSchema),
  vehiclePricingController.deleteOne
);

export { adminCategoryPricingRoutes, adminVehiclePricingRoutes };
