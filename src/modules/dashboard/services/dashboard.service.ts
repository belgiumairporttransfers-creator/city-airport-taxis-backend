import dashboardRepository from "../repositories/dashboard.repository";
import walletService from "@/modules/wallet/services/wallet.service";
import driverRepository from "@/modules/drivers/repositories/driver.repository";
import { calculateDriverEarning } from "@/modules/wallet/utils/driver-earnings";
import { AppError } from "@/shared/errors/AppError";
import type {
  AdminDashboardOverview,
  DriverDashboardOverview,
  UserDashboardOverview,
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
        todayEarned: walletSummary.wallet.todayEarned,
        thisMonthEarned: walletSummary.wallet.thisMonthEarned,
        totalPaidOut: walletSummary.wallet.totalPaidOut,
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
          walletSummary.wallet.commissionPercent,
          booking.payment?.paymentMethod
        );
        const completedAt = booking.trip?.completedAt;

        return {
          id: toId(booking._id),
          bookingNumber: booking.bookingNumber,
          customerName: `${firstName} ${lastName}`.trim() || "Customer",
          date: toIso(completedAt ?? booking.updatedAt ?? booking.createdAt),
          amount: driverEarning,
          status: booking.status,
          isComplete: true,
        };
      }),
    };
  }

  // ─── User (customer) dashboard ──────────────────────────────────────────────

  async getUserOverview(email: string, userId: string, months = 6): Promise<UserDashboardOverview> {
    const [total, completed, upcoming, cancelled, nextRides, topDestinations, chart, completedBookings] =
      await Promise.all([
        dashboardRepository.countUserBookings(email, userId),
        dashboardRepository.countUserBookings(email, userId, { status: "complete" }),
        dashboardRepository.countUserBookings(email, userId, {
          status: { $in: ["pending", "confirmed", "accepted"] },
          "route.pickupDate": { $gte: new Date().toISOString().split("T")[0] },
        }),
        dashboardRepository.countUserBookings(email, userId, { status: "cancelled" }),
        dashboardRepository.findUserNextRides(email, userId, 5),
        dashboardRepository.getUserTopDestinations(email, userId, 5),
        dashboardRepository.getUserMonthlyChart(email, userId, months),
        dashboardRepository.findUserBookings(email, userId, 1, 1000),
      ]);

    const completedAmounts = completedBookings
      .filter((b) => b.status === "complete")
      .map((b) => Number((b as Record<string, unknown> & { pricing?: { total?: number } }).pricing?.total ?? 0));

    const totalSpent = roundMoney(completedAmounts.reduce((sum, v) => sum + v, 0));
    const averageRideValue = completedAmounts.length > 0 ? roundMoney(totalSpent / completedAmounts.length) : 0;

    // next & last ride dates
    const allByDate = completedBookings
      .filter((b) => {
        const route = (b as Record<string, unknown> & { route?: { pickupDate?: string } }).route;
        return !!route?.pickupDate;
      })
      .map((b) => {
        const route = (b as Record<string, unknown> & { route?: { pickupDate?: string } }).route;
        return route?.pickupDate ?? "";
      })
      .sort();
    const lastRideDate = allByDate.length > 0 ? allByDate[allByDate.length - 1] : undefined;
    const nextRideDate = nextRides.length > 0
      ? (nextRides[0] as Record<string, unknown> & { route?: { pickupDate?: string } }).route?.pickupDate
      : undefined;

    return {
      stats: {
        totalRides: total,
        completedRides: completed,
        upcomingRides: upcoming,
        cancelledRides: cancelled,
        totalSpent,
        averageRideValue,
        nextRideDate,
        lastRideDate,
      },
      nextRides: nextRides.map((b) => {
        const bAny = b as Record<string, unknown> & {
          _id: unknown;
          bookingNumber?: string;
          route?: {
            pickupDate?: string;
            pickupTime?: string;
            pickupAddress?: string;
            dropoffAddress?: string;
            deliveryAddress?: string;
          };
          pricing?: { total?: number };
          status?: string;
        };
        return {
          _id: toId(bAny._id),
          bookingNumber: bAny.bookingNumber ?? "",
          pickupDate: bAny.route?.pickupDate ?? "",
          pickupTime: bAny.route?.pickupTime ?? "",
          pickupAddress: bAny.route?.pickupAddress ?? "",
          dropoffAddress: bAny.route?.dropoffAddress || bAny.route?.deliveryAddress || "",
          amount: roundMoney(Number(bAny.pricing?.total ?? 0)),
          status: bAny.status ?? "",
        };
      }),
      topDestinations,
      chart,
    };
  }

  async getUserBookings(email: string, userId: string, page = 1, limit = 10) {
    const [rawItems, total] = await Promise.all([
      dashboardRepository.findUserBookings(email, userId, page, limit),
      dashboardRepository.countUserBookings(email, userId),
    ]);
    const totalPages = Math.ceil(total / limit) || 1;

    const items = rawItems.map((b: Record<string, any>) => {
      const customer = b.customer || {};
      const route = b.route || {};
      const pricing = b.pricing || {};
      const payment = b.payment || b.paymentInfo || {};

      const firstName = customer.firstName || "";
      const lastName = customer.lastName || "";
      const fullName =
        customer.fullName ||
        (firstName && lastName && firstName !== lastName
          ? `${firstName} ${lastName}`.trim()
          : firstName || lastName || "");

      return {
        ...b,
        _id: b._id?.toString() ?? "",
        bookingNumber: b.bookingNumber ?? "",
        status: b.status ?? "",
        category: b.category ?? "",
        amount: roundMoney(Number(pricing.total ?? b.amount ?? 0)),
        paymentMethod: payment.paymentMethod || b.paymentMethod || "mollie",
        paymentStatus: payment.paymentStatus || b.paymentStatus || "",
        passengerDetails: {
          firstName,
          lastName,
          fullName: fullName || "N/A",
          email: customer.email || "",
          phone: customer.phone || "",
        },
        tripDetails: {
          pickupAddress: route.pickupAddress || "",
          deliveryAddress: route.dropoffAddress || route.deliveryAddress || "",
          pickupDate: route.pickupDate || "",
          pickupTime: route.pickupTime || "",
          returnDate: route.returnDate || "",
          returnTime: route.returnTime || "",
          distance: route.distance,
          durationMinutes: route.durationMinutes,
          airportPickup: route.airportPickup,
        },
      };
    });

    return { items, page, limit, total, totalPages };
  }

  async deleteUserBooking(bookingId: string, email: string, userId: string) {
    return dashboardRepository.deleteUserBooking(bookingId, email, userId);
  }

  async bulkDeleteUserBookings(bookingIds: string[], email: string, userId: string) {
    return dashboardRepository.bulkDeleteUserBookings(bookingIds, email, userId);
  }

  async cancelUserBooking(bookingId: string, email: string, userId: string, reason?: string) {
    return dashboardRepository.cancelUserBooking(bookingId, email, userId, reason);
  }

  async getUserPayments(email: string, userId: string, page = 1, limit = 10) {
    const bookingIds = await dashboardRepository.findUserBookingIds(email, userId);
    const [items, total] = await Promise.all([
      dashboardRepository.findUserPayments(bookingIds, page, limit),
      dashboardRepository.countUserPayments(bookingIds),
    ]);
    const totalPages = Math.ceil(total / limit);
    return { items, page, limit, total, totalPages };
  }
}

export default new DashboardService();
