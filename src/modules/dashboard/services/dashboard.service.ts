import dashboardRepository from "../repositories/dashboard.repository";
import walletService from "@/modules/wallet/services/wallet.service";
import driverRepository from "@/modules/drivers/repositories/driver.repository";
import { calculateDriverEarning } from "@/modules/wallet/utils/driver-earnings";
import { AppError } from "@/shared/errors/AppError";
import type {
  AdminDashboardOverview,
  DriverDashboardOverview,
} from "../types/dashboard.types";

const roundMoney = (value: number) => Math.round(value * 100) / 100;

const toIso = (value: unknown): string => {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return "";
};

const toId = (value: unknown): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "toString" in value) {
    return String(value);
  }
  return "";
};

class DashboardService {
  async getAdminOverview(): Promise<AdminDashboardOverview> {
    const [users, drivers, completedBookings, revenueAgg, payments, recentOrders, series] =
      await Promise.all([
        dashboardRepository.countCustomers(),
        dashboardRepository.countApprovedDrivers(),
        dashboardRepository.countCompletedBookings(),
        dashboardRepository.sumPaidRevenue(),
        dashboardRepository.findRecentPayments(12),
        dashboardRepository.findRecentBookings(8),
        dashboardRepository.getAdminSeries(),
      ]);

    return {
      totals: {
        revenue: roundMoney(revenueAgg[0]?.total ?? 0),
        users,
        drivers,
        completedBookings,
      },
      series,
      payments: payments.map((payment) => {
        const booking = payment.bookingId as
          | { bookingNumber?: string; customer?: { firstName?: string; lastName?: string } }
          | undefined;
        const firstName = booking?.customer?.firstName ?? "";
        const lastName = booking?.customer?.lastName ?? "";
        const name = `${firstName} ${lastName}`.trim() || "Customer";

        return {
          id: toId(payment._id),
          name,
          reference: booking?.bookingNumber ?? payment.transactionId ?? toId(payment._id),
          amount: roundMoney(Number(payment.amount ?? 0)),
          currency: payment.currency ?? "EUR",
          status: payment.status,
          createdAt: toIso(payment.createdAt),
        };
      }),
      recentOrders: recentOrders.map((booking) => {
        const firstName = booking.customer?.firstName ?? "";
        const lastName = booking.customer?.lastName ?? "";

        return {
          id: toId(booking._id),
          bookingNumber: booking.bookingNumber,
          customerName: `${firstName} ${lastName}`.trim() || "Customer",
          date: toIso(booking.createdAt),
          amount: roundMoney(Number(booking.pricing?.total ?? 0)),
          paymentStatus: booking.payment?.paymentStatus ?? "pending",
          status: booking.status,
        };
      }),
    };
  }

  async getDriverOverview(driverUserId: string): Promise<DriverDashboardOverview> {
    const driver = await driverRepository.findByUserId(driverUserId);

    if (!driver) {
      throw new AppError("Driver application not found", 404);
    }

    if (driver.status !== "approved") {
      throw new AppError("Driver account is not approved", 403);
    }

    const driverId = driver._id.toString();
    const [walletSummary, activeBookings, completedBookings, transactions, recentOrders, series] =
      await Promise.all([
        walletService.getDriverWalletSummary(driverUserId),
        dashboardRepository.countDriverBookings(driverId, "accepted"),
        dashboardRepository.countDriverBookings(driverId, "complete"),
        dashboardRepository.findRecentWalletTransactions(driverId, 12),
        dashboardRepository.findRecentDriverBookings(driverId, 8),
        dashboardRepository.getDriverSeries(driverId),
      ]);

    return {
      totals: {
        totalEarned: walletSummary.wallet.totalEarned,
        availableBalance: walletSummary.wallet.availableBalance,
        thisMonthEarned: walletSummary.wallet.thisMonthEarned,
        activeBookings,
        completedBookings,
        totalTrips: walletSummary.wallet.totalTrips,
        currency: walletSummary.wallet.currency,
      },
      series,
      transactions: transactions.map((tx) => ({
        id: toId(tx._id),
        name: tx.description || "Wallet transaction",
        reference: tx.bookingNumber ?? toId(tx._id),
        amount: roundMoney(Number(tx.amount ?? 0)),
        currency: tx.currency ?? "EUR",
        direction: tx.direction,
        type: tx.type,
        status: tx.status,
        createdAt: toIso(tx.createdAt),
      })),
      recentOrders: recentOrders.map((booking) => {
        const firstName = booking.customer?.firstName ?? "";
        const lastName = booking.customer?.lastName ?? "";
        const total = Number(booking.pricing?.total ?? 0);
        const driverEarning = calculateDriverEarning(
          total,
          walletSummary.wallet.commissionPercent
        );

        return {
          id: toId(booking._id),
          bookingNumber: booking.bookingNumber,
          customerName: `${firstName} ${lastName}`.trim() || "Customer",
          date: toIso(booking.createdAt),
          amount: driverEarning,
          status: booking.status,
          isComplete: booking.status === "complete",
        };
      }),
    };
  }
}

export default new DashboardService();
