import { Router, type IRouter } from "express";
import vehicleController from "../controllers/vehicle.controller";
import { validateParams, validateQuery, validateRequest } from "@/middleware/validate";
import {
  createVehicleSchema,
  getVehiclesQuerySchema,
  updateVehicleSchema,
} from "../validators/vehicle.validator";
import { idParamSchema } from "@/shared/validators/object-id.schema";

const adminVehicleRoutes: IRouter = Router();

adminVehicleRoutes.get("/", validateQuery(getVehiclesQuerySchema), vehicleController.getAll);
adminVehicleRoutes.get("/:id", validateParams(idParamSchema), vehicleController.getOne);
adminVehicleRoutes.post("/", validateRequest(createVehicleSchema), vehicleController.create);
adminVehicleRoutes.patch(
  "/:id",
  validateParams(idParamSchema),
  validateRequest(updateVehicleSchema),
  vehicleController.update
);
adminVehicleRoutes.delete("/:id", validateParams(idParamSchema), vehicleController.deleteOne);

export default adminVehicleRoutes;
