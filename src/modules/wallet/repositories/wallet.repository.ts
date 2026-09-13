import { Types } from "mongoose";
import { Booking } from "@/infrastructure/database/models/Booking";
import { DriverWallet } from "@/infrastructure/database/models/DriverWallet";
import { WalletTransaction } from "@/infrastructure/database/models/WalletTransaction";
import APIFeature from "@/shared/utils/APIFeature";
import type {
  GetWalletTransactionsQuery,
  WalletTransactionType,
} from "../types/wallet.types";

type CreditDriverInput = {
  driverId: string;
  driverUserId: string;
  bookingId: string;
  bookingNumber: string;
  grossAmount: number;
  commissionPercent: number;
  amount: number;
  description: string;
};

type CreatePayoutInput = {
  driverId: string;
  driverUserId: string;
  amount: number;
  note?: string;
};

class WalletRepository {
  findWalletByDriverId(driverId: string) {
    return DriverWallet.findOne({ driverId: new Types.ObjectId(driverId) });
  }

  findTransactionById(transactionId: string) {
    return WalletTransaction.findById(transactionId);
  }

  findTransactionByBooking(bookingId: string, type: WalletTransactionType) {
    return WalletTransaction.findOne({
      bookingId: new Types.ObjectId(bookingId),
      type,
    });
  }

  async creditDriver(input: CreditDriverInput) {
    const wallet = await DriverWallet.findOneAndUpdate(
      { driverId: new Types.ObjectId(input.driverId) },
      {
        $inc: {
          availableBalance: input.amount,
          totalEarned: input.amount,
          totalTrips: 1,
        },
        $setOnInsert: {
          driverUserId: new Types.ObjectId(input.driverUserId),
          currency: "EUR",
          totalPaidOut: 0,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const transaction = await WalletTransaction.create({
      walletId: wallet._id,
      driverId: new Types.ObjectId(input.driverId),
      driverUserId: new Types.ObjectId(input.driverUserId),
      bookingId: new Types.ObjectId(input.bookingId),
      bookingNumber: input.bookingNumber,
      type: "trip_earning",
      direction: "credit",
      status: "completed",
      grossAmount: input.grossAmount,
      commissionPercent: input.commissionPercent,
      amount: input.amount,
      currency: "EUR",
      description: input.description,
    });

    return { wallet, transaction };
  }

  async ensureWallet(driverId: string, driverUserId: string) {
    return DriverWallet.findOneAndUpdate(
      { driverId: new Types.ObjectId(driverId) },
      {
        $setOnInsert: {
          driverUserId: new Types.ObjectId(driverUserId),
          currency: "EUR",
          availableBalance: 0,
          totalEarned: 0,
          totalPaidOut: 0,
          totalTrips: 0,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  sumPendingWithdrawals(driverId: string) {
    return WalletTransaction.aggregate<{ total: number }>([
      {
        $match: {
          driverId: new Types.ObjectId(driverId),
          type: "withdrawal",
          status: "pending",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);
  }

  async createPayoutRequest(input: CreatePayoutInput) {
    const wallet = await this.ensureWallet(input.driverId, input.driverUserId);

    const transaction = await WalletTransaction.create({
      walletId: wallet._id,
      driverId: new Types.ObjectId(input.driverId),
      driverUserId: new Types.ObjectId(input.driverUserId),
      type: "withdrawal",
      direction: "debit",
      status: "pending",
      grossAmount: input.amount,
      commissionPercent: 0,
      amount: input.amount,
      currency: wallet.currency || "EUR",
      description: `Payout request · ${input.amount.toFixed(2)} EUR`,
      ...(input.note?.trim() ? { requestNote: input.note.trim() } : {}),
    });

    return { wallet, transaction };
  }

  async approvePayout(transactionId: string, adminId: string) {
    const transaction = await WalletTransaction.findOneAndUpdate(
      {
        _id: new Types.ObjectId(transactionId),
        type: "withdrawal",
        status: "pending",
      },
      {
        $set: {
          status: "completed",
          processedAt: new Date(),
          processedBy: new Types.ObjectId(adminId),
          description: `Payout approved`,
        },
      },
      { new: true }
    );

    if (!transaction) {
      return null;
    }

    const wallet = await DriverWallet.findOneAndUpdate(
      {
        driverId: transaction.driverId,
        availableBalance: { $gte: transaction.amount },
      },
      {
        $inc: {
          availableBalance: -transaction.amount,
          totalPaidOut: transaction.amount,
        },
      },
      { new: true }
    );

    if (!wallet) {
      await WalletTransaction.findByIdAndUpdate(transaction._id, {
        status: "pending",
        $unset: { processedAt: 1, processedBy: 1 },
        description: `Payout request · ${transaction.amount.toFixed(2)} EUR`,
      });
      return { wallet: null, transaction: null, insufficientBalance: true as const };
    }

    await WalletTransaction.findByIdAndUpdate(transaction._id, {
      description: `Payout approved · ${transaction.amount.toFixed(2)} EUR`,
    });

    const refreshed = await WalletTransaction.findById(transaction._id);
    return { wallet, transaction: refreshed ?? transaction, insufficientBalance: false as const };
  }

  async rejectPayout(transactionId: string, adminId: string, adminNotes?: string) {
    const existing = await WalletTransaction.findOne({
      _id: new Types.ObjectId(transactionId),
      type: "withdrawal",
      status: "pending",
    });

    if (!existing) {
      return null;
    }

    return WalletTransaction.findByIdAndUpdate(
      existing._id,
      {
        $set: {
          status: "failed",
          processedAt: new Date(),
          processedBy: new Types.ObjectId(adminId),
          description: `Payout rejected · ${existing.amount.toFixed(2)} EUR`,
          ...(adminNotes?.trim() ? { adminNotes: adminNotes.trim() } : {}),
        },
      },
      { new: true }
    );
  }

  findCompletedBookingsForDriver(driverId: string) {
    return Booking.find({
      currentDriverId: new Types.ObjectId(driverId),
      status: "complete",
    })
      .select("_id bookingNumber pricing currentDriverId payment")
      .lean();
  }

  findCompletedBookingsForEarningsReport(driverId?: string) {
    const filter: Record<string, unknown> = {
      status: "complete",
      currentDriverId: { $ne: null },
    };

    if (driverId) {
      filter.currentDriverId = new Types.ObjectId(driverId);
    }

    return Booking.find(filter)
      .select("_id bookingNumber pricing payment status route currentDriverId")
      .sort({ "route.pickupDate": -1, createdAt: -1 })
      .lean();
  }

  sumEarningsSince(driverId: string, since: Date) {
    return WalletTransaction.aggregate<{ total: number }>([
      {
        $match: {
          driverId: new Types.ObjectId(driverId),
          direction: "credit",
          status: "completed",
          createdAt: { $gte: since },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);
  }

  findTransactions(driverId: string, query: GetWalletTransactionsQuery) {
    return new APIFeature(WalletTransaction, query, {
      initialFilter: { driverId: new Types.ObjectId(driverId) },
      pagination: { defaultLimit: 20 },
      sort: {
        defaultSort: "-createdAt",
        allowedFields: ["createdAt", "amount", "type", "status"],
      },
      filterFields: ["type", "status", "direction"],
      excludeFields: ["__v"],
      lean: true,
    }).execute();
  }

  findPayouts(driverId: string, query: GetWalletTransactionsQuery) {
    return new APIFeature(
      WalletTransaction,
      { ...query, type: "withdrawal" },
      {
        initialFilter: {
          driverId: new Types.ObjectId(driverId),
          type: "withdrawal",
        },
        pagination: { defaultLimit: 20 },
        sort: {
          defaultSort: "-createdAt",
          allowedFields: ["createdAt", "amount", "status"],
        },
        filterFields: ["status"],
        excludeFields: ["__v"],
        lean: true,
      }
    ).execute();
  }

  async findAllPayouts(query: GetWalletTransactionsQuery) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
    const skip = (page - 1) * limit;

    const match: Record<string, unknown> = { type: "withdrawal" };
    if (query.status) {
      match.status = query.status;
    }

    const [items, countResult] = await Promise.all([
      WalletTransaction.aggregate([
        { $match: match },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: "drivers",
            localField: "driverId",
            foreignField: "_id",
            as: "driver",
          },
        },
        {
          $unwind: {
            path: "$driver",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 1,
            walletId: 1,
            driverId: 1,
            driverUserId: 1,
            type: 1,
            direction: 1,
            status: 1,
            amount: 1,
            currency: 1,
            description: 1,
            requestNote: 1,
            adminNotes: 1,
            processedAt: 1,
            processedBy: 1,
            createdAt: 1,
            updatedAt: 1,
            driver: {
              _id: "$driver._id",
              applicationNumber: "$driver.applicationNumber",
              firstName: "$driver.firstName",
              lastName: "$driver.lastName",
              email: "$driver.email",
              phone: "$driver.phone",
            },
          },
        },
      ]),
      WalletTransaction.countDocuments(match),
    ]);

    const total = countResult;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      data: items,
      page,
      limit,
      total,
      pages: totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }

  findRecentTransactions(driverId: string, limit = 5) {
    return WalletTransaction.find({ driverId: new Types.ObjectId(driverId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }
}

export default new WalletRepository();
