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

class WalletRepository {
  findWalletByDriverId(driverId: string) {
    return DriverWallet.findOne({ driverId: new Types.ObjectId(driverId) });
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

  findCompletedBookingsForDriver(driverId: string) {
    return Booking.find({
      currentDriverId: new Types.ObjectId(driverId),
      status: "complete",
    })
      .select("_id bookingNumber pricing currentDriverId")
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

  findRecentTransactions(driverId: string, limit = 5) {
    return WalletTransaction.find({ driverId: new Types.ObjectId(driverId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }
}

export default new WalletRepository();
