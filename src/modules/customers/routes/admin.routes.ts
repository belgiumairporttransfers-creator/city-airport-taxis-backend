import { Router, type IRouter } from "express";
import customerController from "../controllers/customer.controller";
import { validateParams, validateQuery, validateRequest } from "@/middleware/validate";
import {
  createCustomerSchema,
  getCustomersQuerySchema,
  updateCustomerSchema,
} from "../validators/customer.validator";
import { idParamSchema } from "@/shared/validators/object-id.schema";

const adminCustomerRoutes: IRouter = Router();

adminCustomerRoutes.get("/", validateQuery(getCustomersQuerySchema), customerController.getAll);
adminCustomerRoutes.get("/:id", validateParams(idParamSchema), customerController.getOne);
adminCustomerRoutes.post("/", validateRequest(createCustomerSchema), customerController.create);
adminCustomerRoutes.patch(
  "/:id",
  validateParams(idParamSchema),
  validateRequest(updateCustomerSchema),
  customerController.update
);
adminCustomerRoutes.post("/:id/archive", validateParams(idParamSchema), customerController.archive);
adminCustomerRoutes.post("/:id/restore", validateParams(idParamSchema), customerController.restore);

export default adminCustomerRoutes;
