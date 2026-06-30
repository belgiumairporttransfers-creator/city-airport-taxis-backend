import { Router, type IRouter } from "express";
import { protectUser } from "@/middleware/auth";
import { validateQuery } from "@/middleware/validate";
import walletPortalController from "../controllers/wallet-portal.controller";
import { getWalletTransactionsQuerySchema } from "../validators/wallet.validator";

const portalWalletRoutes: IRouter = Router();

portalWalletRoutes.use(protectUser);
portalWalletRoutes.get("/wallet", walletPortalController.getSummary);
portalWalletRoutes.get(
  "/wallet/transactions",
  validateQuery(getWalletTransactionsQuerySchema),
  walletPortalController.getTransactions
);

export default portalWalletRoutes;
