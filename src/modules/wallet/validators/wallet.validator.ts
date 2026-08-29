import Joi from "joi";
import {
  WALLET_TRANSACTION_STATUSES,
  WALLET_TRANSACTION_TYPES,
} from "../types/wallet.types";

export const getWalletTransactionsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  type: Joi.string()
    .valid(...WALLET_TRANSACTION_TYPES)
    .optional(),
  status: Joi.string()
    .valid(...WALLET_TRANSACTION_STATUSES)
    .optional(),
  sort: Joi.string().trim().optional(),
});

export const requestPayoutSchema = Joi.object({
  amount: Joi.number().positive().precision(2).required().messages({
    "any.required": "Payout amount is required",
    "number.base": "Payout amount must be a number",
    "number.positive": "Payout amount must be greater than zero",
  }),
  note: Joi.string().trim().allow("", null).max(1000).optional(),
});

export const rejectPayoutSchema = Joi.object({
  adminNotes: Joi.string().trim().allow("", null).max(1000).optional(),
});
