import Joi from "joi";
import { WALLET_TRANSACTION_TYPES } from "../types/wallet.types";

export const getWalletTransactionsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  type: Joi.string()
    .valid(...WALLET_TRANSACTION_TYPES)
    .optional(),
  sort: Joi.string().trim().optional(),
});
