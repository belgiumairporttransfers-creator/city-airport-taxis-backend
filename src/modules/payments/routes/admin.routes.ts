import { Router, type IRouter } from "express";
import paymentAdminController from "../controllers/payment-admin.controller";
import { validateParams, validateQuery, validateRequest } from "@/middleware/validate";
import { idParamSchema } from "@/shared/validators/object-id.schema";
import {
  bulkDeletePaymentsSchema,
  getPaymentsQuerySchema,
} from "../validators/payment.validator";

const adminPaymentRoutes: IRouter = Router();

adminPaymentRoutes.get(
  "/",
  validateQuery(getPaymentsQuerySchema),
  paymentAdminController.getAll
);

adminPaymentRoutes.delete(
  "/bulk",
  validateRequest(bulkDeletePaymentsSchema),
  paymentAdminController.bulkDelete
);

adminPaymentRoutes.delete(
  "/:id",
  validateParams(idParamSchema),
  paymentAdminController.deleteOne
);

export default adminPaymentRoutes;
