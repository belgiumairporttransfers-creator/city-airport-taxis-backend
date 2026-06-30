import { AppError } from "@/shared/errors/AppError";
import driverRepository from "@/modules/drivers/repositories/driver.repository";
import settingsService from "@/modules/settings/services/settings.service";
import type { IBooking } from "@/modules/bookings/types/booking.types";
import walletRepository from "../repositories/wallet.repository";
import { calculateDriverEarning } from "../utils/driver-earnings";
import type { GetWalletTransactionsQuery } from "../types/wallet.types";

const roundMoney = (value: number) => Math.round(value * 100) / 100;

const getMonthStart = (date = new Date()) => new Date(date.getFullYear(), date.getMonth(), 1);

const getPreviousMonthStart = (date = new Date()) =>
  new Date(date.getFullYear(), date.getMonth() - 1, 1);

class WalletService {
  private async getApprovedDriverByUserId(driverUserId: string) {
    const application = await driverRepository.findByUserId(driverUserId);

    if (!application) {
      throw new AppError("Driver application not found", 404);
    }

    if (application.status !== "approved") {
      throw new AppError("Driver account is not approved", 403);
    }

    return application;
  }

  async getCommissionPercent() {
    return this.getCommissionPercentPrivate();
  }

  private async getCommissionPercentPrivate() {
    const settings = await settingsService.getSettings();
    return Number(settings.driverCommissionPercent ?? 10);
  }

  async creditTripEarning(booking: IBooking, driverUserId: string) {
    if (!booking.currentDriverId || booking.status !== "complete") {
      return null;
    }

    const driver = await driverRepository.findById(booking.currentDriverId.toString());

    if (!driver?.userId || driver.userId.toString() !== driverUserId) {
      return null;
    }

    const driverUserObjectId = driver.userId.toString();

    const existing = await walletRepository.findTransactionByBooking(
      booking._id.toString(),
      "trip_earning"
    );

    if (existing) {
      return existing;
    }

    const commissionPercent = await this.getCommissionPercentPrivate();
    const grossAmount = Number(booking.pricing?.total ?? 0);
    const amount = calculateDriverEarning(grossAmount, commissionPercent);

    if (amount <= 0) {
      return null;
    }

    try {
      return await walletRepository.creditDriver({
        driverId: driver._id.toString(),
        driverUserId: driverUserObjectId,
        bookingId: booking._id.toString(),
        bookingNumber: booking.bookingNumber,
        grossAmount,
        commissionPercent,
        amount,
        description: `Trip completed · ${booking.bookingNumber}`,
      });
    } catch (error) {
      const duplicateKey =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: number }).code === 11000;

      if (duplicateKey) {
        return walletRepository.findTransactionByBooking(booking._id.toString(), "trip_earning");
      }

      throw error;
    }
  }

  async syncMissingTripEarnings(driverId: string, driverUserId: string) {
    const bookings = await walletRepository.findCompletedBookingsForDriver(driverId);

    for (const booking of bookings) {
      await this.creditTripEarning(booking as unknown as IBooking, driverUserId);
    }
  }

  async getDriverWalletSummary(driverUserId: string) {
    const driver = await this.getApprovedDriverByUserId(driverUserId);
    const driverId = driver._id.toString();

    await this.syncMissingTripEarnings(driverId, driverUserId);

    const wallet = await walletRepository.findWalletByDriverId(driverId);
    const commissionPercent = await this.getCommissionPercentPrivate();
    const thisMonthStart = getMonthStart();
    const previousMonthStart = getPreviousMonthStart();

    const [thisMonthAgg, lastMonthAgg, recentTransactions] = await Promise.all([
      walletRepository.sumEarningsSince(driverId, thisMonthStart),
      walletRepository.sumEarningsSince(driverId, previousMonthStart),
      walletRepository.findRecentTransactions(driverId, 5),
    ]);

    const lastMonthTotal = lastMonthAgg[0]?.total ?? 0;
    const thisMonthTotal = thisMonthAgg[0]?.total ?? 0;
    const lastMonthOnly = Math.max(0, roundMoney(lastMonthTotal - thisMonthTotal));

    return {
      wallet: {
        currency: wallet?.currency ?? "EUR",
        availableBalance: roundMoney(wallet?.availableBalance ?? 0),
        totalEarned: roundMoney(wallet?.totalEarned ?? 0),
        totalTrips: wallet?.totalTrips ?? 0,
        commissionPercent,
        thisMonthEarned: roundMoney(thisMonthTotal),
        lastMonthEarned: roundMoney(lastMonthOnly),
      },
      recentTransactions,
    };
  }

  async getDriverTransactions(driverUserId: string, query: GetWalletTransactionsQuery) {
    const driver = await this.getApprovedDriverByUserId(driverUserId);
    const result = await walletRepository.findTransactions(driver._id.toString(), query);

    return {
      items: result.data,
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.pages,
      hasNextPage: result.hasNextPage,
      hasPrevPage: result.hasPrevPage,
    };
  }
}

export default new WalletService();
