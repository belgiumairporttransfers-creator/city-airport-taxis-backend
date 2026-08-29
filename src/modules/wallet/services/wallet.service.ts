import { AppError } from "@/shared/errors/AppError";
import logger from "@/shared/utils/logger";
import emailService from "@/infrastructure/email/email.service";
import notificationService from "@/modules/notifications/services/notification.service";
import driverRepository from "@/modules/drivers/repositories/driver.repository";
import settingsService from "@/modules/settings/services/settings.service";
import type { IBooking } from "@/modules/bookings/types/booking.types";
import walletRepository from "../repositories/wallet.repository";
import { calculateDriverEarning } from "../utils/driver-earnings";
import type {
  GetWalletTransactionsQuery,
  IWalletTransaction,
  RequestPayoutData,
} from "../types/wallet.types";
import type { IDriver } from "@/modules/drivers/types/driver.types";

const roundMoney = (value: number) => Math.round(value * 100) / 100;

const getMonthStart = (date = new Date()) => new Date(date.getFullYear(), date.getMonth(), 1);

const getPreviousMonthStart = (date = new Date()) =>
  new Date(date.getFullYear(), date.getMonth() - 1, 1);

const getDayStart = (date = new Date()) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

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
    const effectiveCommissionPercent =
      booking.payment?.paymentMethod === "pay_onboard" ? 0 : commissionPercent;
    const grossAmount = Number(booking.pricing?.total ?? 0);
    const amount = calculateDriverEarning(
      grossAmount,
      commissionPercent,
      booking.payment?.paymentMethod
    );

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
        commissionPercent: effectiveCommissionPercent,
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
    return this.buildWalletSummary(driver._id.toString(), driver.userId?.toString());
  }

  async getDriverTransactions(driverUserId: string, query: GetWalletTransactionsQuery) {
    const driver = await this.getApprovedDriverByUserId(driverUserId);
    return this.getTransactionsByDriverId(driver._id.toString(), query);
  }

  async getDriverPayouts(driverUserId: string, query: GetWalletTransactionsQuery) {
    const driver = await this.getApprovedDriverByUserId(driverUserId);
    return this.getPayoutsByDriverId(driver._id.toString(), query);
  }

  async requestPayout(driverUserId: string, data: RequestPayoutData) {
    const driver = await this.getApprovedDriverByUserId(driverUserId);
    const driverId = driver._id.toString();
    const amount = roundMoney(Number(data.amount));

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new AppError("Payout amount must be greater than zero", 400);
    }

    await this.syncMissingTripEarnings(driverId, driverUserId);

    const wallet = await walletRepository.ensureWallet(driverId, driverUserId);
    const pendingAgg = await walletRepository.sumPendingWithdrawals(driverId);
    const pendingTotal = roundMoney(pendingAgg[0]?.total ?? 0);
    const available = roundMoney(wallet.availableBalance ?? 0);
    const spendable = roundMoney(available - pendingTotal);

    if (amount > spendable) {
      throw new AppError(
        spendable <= 0
          ? "No available balance for payout"
          : `Payout amount exceeds available balance (${spendable.toFixed(2)} EUR)`,
        400
      );
    }

    const result = await walletRepository.createPayoutRequest({
      driverId,
      driverUserId,
      amount,
      note: data.note,
    });

    await this.notifyDriverPayoutRequested(driver, result.transaction);
    await this.notifyAdminsOfPayoutRequest(driver, result.transaction);

    return result.transaction;
  }

  async getAdminDriverWalletSummary(driverId: string) {
    const driver = await driverRepository.findById(driverId);

    if (!driver) {
      throw new AppError("Driver not found", 404);
    }

    return this.buildWalletSummary(driver._id.toString(), driver.userId?.toString());
  }

  async getAdminDriverTransactions(driverId: string, query: GetWalletTransactionsQuery) {
    const driver = await driverRepository.findById(driverId);

    if (!driver) {
      throw new AppError("Driver not found", 404);
    }

    return this.getTransactionsByDriverId(driver._id.toString(), query);
  }

  async getAdminDriverPayouts(driverId: string, query: GetWalletTransactionsQuery) {
    const driver = await driverRepository.findById(driverId);

    if (!driver) {
      throw new AppError("Driver not found", 404);
    }

    return this.getPayoutsByDriverId(driver._id.toString(), query);
  }

  async getAllAdminPayouts(query: GetWalletTransactionsQuery) {
    const result = await walletRepository.findAllPayouts(query);

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

  async approvePayout(driverId: string, transactionId: string, adminId: string) {
    const driver = await driverRepository.findById(driverId);

    if (!driver) {
      throw new AppError("Driver not found", 404);
    }

    const existing = await walletRepository.findTransactionById(transactionId);

    if (
      !existing ||
      existing.driverId.toString() !== driverId ||
      existing.type !== "withdrawal"
    ) {
      throw new AppError("Payout request not found", 404);
    }

    if (existing.status !== "pending") {
      throw new AppError("Only pending payouts can be approved", 400);
    }

    const result = await walletRepository.approvePayout(transactionId, adminId);

    if (!result || result.insufficientBalance) {
      throw new AppError("Insufficient wallet balance to approve this payout", 400);
    }

    if (!result.transaction) {
      throw new AppError("Failed to approve payout", 500);
    }

    await this.notifyDriverPayoutApproved(driver, result.transaction);

    return result.transaction;
  }

  async rejectPayout(
    driverId: string,
    transactionId: string,
    adminId: string,
    adminNotes?: string
  ) {
    const driver = await driverRepository.findById(driverId);

    if (!driver) {
      throw new AppError("Driver not found", 404);
    }

    const existing = await walletRepository.findTransactionById(transactionId);

    if (
      !existing ||
      existing.driverId.toString() !== driverId ||
      existing.type !== "withdrawal"
    ) {
      throw new AppError("Payout request not found", 404);
    }

    if (existing.status !== "pending") {
      throw new AppError("Only pending payouts can be rejected", 400);
    }

    const updated = await walletRepository.rejectPayout(transactionId, adminId, adminNotes);

    if (!updated) {
      throw new AppError("Failed to reject payout", 500);
    }

    await this.notifyDriverPayoutRejected(driver, updated);

    return updated;
  }

  private async notifyDriverPayoutRequested(driver: IDriver, transaction: IWalletTransaction) {
    try {
      if (!driver.email) return;

      await emailService.sendDriverPayoutRequestedEmail(
        { firstName: driver.firstName, email: driver.email },
        {
          amount: Number(transaction.amount),
          note: transaction.requestNote,
        }
      );
    } catch (error) {
      logger.error("Failed to send payout requested email to driver", { error });
    }
  }

  private async notifyDriverPayoutApproved(driver: IDriver, transaction: IWalletTransaction) {
    try {
      if (!driver.email) return;

      await emailService.sendDriverPayoutApprovedEmail(
        { firstName: driver.firstName, email: driver.email },
        { amount: Number(transaction.amount) }
      );
    } catch (error) {
      logger.error("Failed to send payout approved email to driver", { error });
    }
  }

  private async notifyDriverPayoutRejected(driver: IDriver, transaction: IWalletTransaction) {
    try {
      if (!driver.email) return;

      await emailService.sendDriverPayoutRejectedEmail(
        { firstName: driver.firstName, email: driver.email },
        {
          amount: Number(transaction.amount),
          adminNotes: transaction.adminNotes,
        }
      );
    } catch (error) {
      logger.error("Failed to send payout rejected email to driver", { error });
    }
  }

  private async notifyAdminsOfPayoutRequest(driver: IDriver, transaction: IWalletTransaction) {
    try {
      await notificationService.notifyAdmins({
        title: "Payout Requested",
        message: `${driver.firstName} ${driver.lastName} requested a payout of €${Number(
          transaction.amount
        ).toFixed(2)}.`,
        type: "wallet.payout.requested",
        severity: "info",
        entityType: "driver",
        entityId: driver._id.toString(),
        actionUrl: `/drivers/${driver._id.toString()}/wallet`,
      });
    } catch (error) {
      logger.error("Failed to notify admins about payout request", { error });
    }
  }

  private async buildWalletSummary(driverId: string, driverUserId?: string) {
    if (driverUserId) {
      await this.syncMissingTripEarnings(driverId, driverUserId);
    }

    const wallet = await walletRepository.findWalletByDriverId(driverId);
    const commissionPercent = await this.getCommissionPercentPrivate();
    const thisMonthStart = getMonthStart();
    const previousMonthStart = getPreviousMonthStart();
    const todayStart = getDayStart();

    const [thisMonthAgg, lastMonthAgg, todayAgg, pendingAgg, recentTransactions] =
      await Promise.all([
        walletRepository.sumEarningsSince(driverId, thisMonthStart),
        walletRepository.sumEarningsSince(driverId, previousMonthStart),
        walletRepository.sumEarningsSince(driverId, todayStart),
        walletRepository.sumPendingWithdrawals(driverId),
        walletRepository.findRecentTransactions(driverId, 5),
      ]);

    const lastMonthTotal = lastMonthAgg[0]?.total ?? 0;
    const thisMonthTotal = thisMonthAgg[0]?.total ?? 0;
    const lastMonthOnly = Math.max(0, roundMoney(lastMonthTotal - thisMonthTotal));
    const pendingPayouts = roundMoney(pendingAgg[0]?.total ?? 0);
    const availableBalance = roundMoney(wallet?.availableBalance ?? 0);

    return {
      wallet: {
        currency: wallet?.currency ?? "EUR",
        availableBalance,
        totalEarned: roundMoney(wallet?.totalEarned ?? 0),
        totalPaidOut: roundMoney(wallet?.totalPaidOut ?? 0),
        totalTrips: wallet?.totalTrips ?? 0,
        commissionPercent,
        todayEarned: roundMoney(todayAgg[0]?.total ?? 0),
        thisMonthEarned: roundMoney(thisMonthTotal),
        lastMonthEarned: roundMoney(lastMonthOnly),
        pendingPayouts,
        spendableBalance: roundMoney(Math.max(0, availableBalance - pendingPayouts)),
      },
      recentTransactions,
    };
  }

  private async getTransactionsByDriverId(driverId: string, query: GetWalletTransactionsQuery) {
    const result = await walletRepository.findTransactions(driverId, query);

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

  private async getPayoutsByDriverId(driverId: string, query: GetWalletTransactionsQuery) {
    const result = await walletRepository.findPayouts(driverId, query);

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
