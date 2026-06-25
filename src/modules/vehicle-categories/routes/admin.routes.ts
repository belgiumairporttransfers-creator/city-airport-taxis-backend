import { Router, type IRouter } from "express";
import vehicleCategoryController from "../controllers/vehicle-category.controller";
import { validateParams, validateQuery, validateRequest } from "@/middleware/validate";
import {
  createVehicleCategorySchema,
  getVehicleCategoriesQuerySchema,
  updateVehicleCategorySchema,
} from "../validators/vehicle-category.validator";
import { idParamSchema } from "@/shared/validators/object-id.schema";

const adminVehicleCategoryRoutes: IRouter = Router();

adminVehicleCategoryRoutes.get(
  "/",
  validateQuery(getVehicleCategoriesQuerySchema),
  vehicleCategoryController.getAll
);
adminVehicleCategoryRoutes.get(
  "/:id",
  validateParams(idParamSchema),
  vehicleCategoryController.getOne
);
adminVehicleCategoryRoutes.post(
  "/",
  validateRequest(createVehicleCategorySchema),
  vehicleCategoryController.create
);
adminVehicleCategoryRoutes.patch(
  "/:id",
  validateParams(idParamSchema),
  validateRequest(updateVehicleCategorySchema),
  vehicleCategoryController.update
);
adminVehicleCategoryRoutes.delete(
  "/:id",
  validateParams(idParamSchema),
  vehicleCategoryController.deleteOne
);

export default adminVehicleCategoryRoutes;
