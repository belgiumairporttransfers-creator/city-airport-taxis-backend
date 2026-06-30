import type { IWalletTransaction } from "../types/wallet.types";

type TransactionLike = IWalletTransaction | Record<string, unknown>;

const toIdString = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "toString" in value) {
    return String(value);
  }
  return undefined;
};

const toIsoString = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return undefined;
};

const toRecord = (transaction: TransactionLike): Record<string, unknown> => {
  if (
    typeof transaction === "object" &&
    transaction !== null &&
    typeof (transaction as IWalletTransaction).toObject === "function"
  ) {
    return (transaction as IWalletTransaction).toObject() as Record<string, unknown>;
  }

  return transaction as Record<string, unknown>;
};

export const toWalletTransactionResponse = (transaction: TransactionLike) => {
  const record = toRecord(transaction);

  return {
    id: toIdString(record._id) ?? "",
    bookingId: toIdString(record.bookingId),
    bookingNumber: record.bookingNumber as string | undefined,
    type: record.type as string,
    direction: record.direction as string,
    status: record.status as string,
    grossAmount: Number(record.grossAmount ?? 0),
    commissionPercent: Number(record.commissionPercent ?? 0),
    amount: Number(record.amount ?? 0),
    currency: (record.currency as string) ?? "EUR",
    description: record.description as string,
    createdAt: toIsoString(record.createdAt) ?? "",
  };
};

export const toDriverWalletSummaryResponse = (summary: {
  wallet: {
    currency: string;
    availableBalance: number;
    totalEarned: number;
    totalTrips: number;
    commissionPercent: number;
    thisMonthEarned: number;
    lastMonthEarned: number;
  };
  recentTransactions: TransactionLike[];
}) => ({
  ...summary.wallet,
  recentTransactions: summary.recentTransactions.map(toWalletTransactionResponse),
});
