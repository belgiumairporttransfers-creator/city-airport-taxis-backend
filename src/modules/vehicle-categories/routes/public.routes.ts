import { Router, type IRouter } from "express";
import vehicleCategoryPublicController from "../controllers/vehicle-category-public.controller";
import { validateParams } from "@/middleware/validate";
import { vehicleCategorySlugParamSchema } from "../validators/vehicle-category.validator";

const publicVehicleCategoryRoutes: IRouter = Router();

publicVehicleCategoryRoutes.get("/", vehicleCategoryPublicController.listActive);
publicVehicleCategoryRoutes.get(
  "/:slug",
  validateParams(vehicleCategorySlugParamSchema),
  vehicleCategoryPublicController.getBySlug
);

export default publicVehicleCategoryRoutes;
