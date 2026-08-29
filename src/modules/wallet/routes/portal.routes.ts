import { Router, type IRouter } from "express";
import { protectUser } from "@/middleware/auth";
import { validateQuery, validateRequest } from "@/middleware/validate";
import walletPortalController from "../controllers/wallet-portal.controller";
import {
  getWalletTransactionsQuerySchema,
  requestPayoutSchema,
} from "../validators/wallet.validator";

const portalWalletRoutes: IRouter = Router();

portalWalletRoutes.use(protectUser);
portalWalletRoutes.get("/wallet", walletPortalController.getSummary);
portalWalletRoutes.get(
  "/wallet/transactions",
  validateQuery(getWalletTransactionsQuerySchema),
  walletPortalController.getTransactions
);
portalWalletRoutes.get(
  "/wallet/payouts",
  validateQuery(getWalletTransactionsQuerySchema),
  walletPortalController.getPayouts
);
portalWalletRoutes.post(
  "/wallet/payouts",
  validateRequest(requestPayoutSchema),
  walletPortalController.requestPayout
);

export default portalWalletRoutes;
