import { Router, type IRouter } from "express";
import driverController from "../controllers/driver.controller";
import walletAdminController from "@/modules/wallet/controllers/wallet-admin.controller";
import { validateParams, validateQuery, validateRequest } from "@/middleware/validate";
import {
  createDriverSchema,
  getDriversQuerySchema,
  optionalReviewNotesSchema,
  reviewNotesSchema,
  updateDriverSchema,
} from "../validators/driver.validator";
import {
  getWalletTransactionsQuerySchema,
  rejectPayoutSchema,
} from "@/modules/wallet/validators/wallet.validator";
import { idParamSchema } from "@/shared/validators/object-id.schema";
import Joi from "joi";

const driverWalletPayoutParamsSchema = Joi.object({
  id: Joi.string().hex().length(24).required(),
  transactionId: Joi.string().hex().length(24).required(),
});

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

adminDriverRoutes.get(
  "/payouts",
  validateQuery(getWalletTransactionsQuerySchema),
  walletAdminController.getAllPayouts
);

adminDriverRoutes.get(
  "/:id/wallet",
  validateParams(idParamSchema),
  walletAdminController.getSummary
);

adminDriverRoutes.get(
  "/:id/wallet/transactions",
  validateParams(idParamSchema),
  validateQuery(getWalletTransactionsQuerySchema),
  walletAdminController.getTransactions
);

adminDriverRoutes.get(
  "/:id/wallet/payouts",
  validateParams(idParamSchema),
  validateQuery(getWalletTransactionsQuerySchema),
  walletAdminController.getPayouts
);

adminDriverRoutes.post(
  "/:id/wallet/payouts/:transactionId/approve",
  validateParams(driverWalletPayoutParamsSchema),
  walletAdminController.approvePayout
);

adminDriverRoutes.post(
  "/:id/wallet/payouts/:transactionId/reject",
  validateParams(driverWalletPayoutParamsSchema),
  validateRequest(rejectPayoutSchema),
  walletAdminController.rejectPayout
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
