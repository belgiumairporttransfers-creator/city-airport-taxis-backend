import { Router, type IRouter } from "express";
import paymentWebhookController from "../controllers/payment-webhook.controller";
import { validateRequest } from "@/middleware/validate";
import { mollieWebhookSchema } from "../validators/payment.validator";

const publicPaymentRoutes: IRouter = Router();

publicPaymentRoutes.post(
  "/mollie/webhook",
  validateRequest(mollieWebhookSchema),
  paymentWebhookController.mollieWebhook
);

export default publicPaymentRoutes;
