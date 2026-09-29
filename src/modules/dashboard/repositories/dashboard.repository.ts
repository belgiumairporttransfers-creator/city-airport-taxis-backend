import { Types } from "mongoose";
import { Booking } from "@/infrastructure/database/models/Booking";
import { Customer } from "@/infrastructure/database/models/Customer";
import { Driver } from "@/infrastructure/database/models/Driver";
import { Payment } from "@/infrastructure/database/models/Payment";
import { WalletTransaction } from "@/infrastructure/database/models/WalletTransaction";
import { Assignment } from "@/infrastructure/database/models/Assignment";
import paymentRepository from "@/modules/payments/repositories/payment.repository";
import { AppError } from "@/shared/errors/AppError";


const SERIES_BUCKETS = 10;

const getMonthStarts = (count = SERIES_BUCKETS) => {
  const now = new Date();
  const starts: Date[] = [];

  for (let i = count - 1; i >= 0; i -= 1) {
    starts.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
  }

  return starts;
};

const fillMonthlySeries = (
  buckets: Date[],
  rows: Array<{ _id: { year: number; month: number }; value: number }>,
  valueKey: "value" = "value"
) => {
  const map = new Map(
    rows.map((row) => [`${row._id.year}-${row._id.month}`, Number(row[valueKey] ?? 0)])
  );

  return buckets.map((date) => {
    const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
    return map.get(key) ?? 0;
  });
};

class DashboardRepository {
  countCustomers() {
    return Customer.countDocuments({ status: "active" });
  }

  countApprovedDrivers() {
    return Driver.countDocuments({ status: "approved" });
  }

  countCompletedBookings() {
    return Booking.countDocuments({ status: "complete" });
  }

  countDriverBookings(driverId: string, status: "accepted" | "complete") {
    return Booking.countDocuments({
      currentDriverId: new Types.ObjectId(driverId),
      assignmentStatus: { $in: ["accepted", "completed"] },
      status,
    });
  }

  sumPaidRevenue() {
    return Payment.aggregate<{ total: number }>([
      { $match: { status: "paid" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
  }

  findRecentPayments(limit = 12) {
    return Payment.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate({ path: "bookingId", select: "customer bookingNumber" })
      .lean();
  }

  findRecentBookings(limit = 8) {
    return Booking.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("bookingNumber customer pricing payment status createdAt")
      .lean();
  }

  findRecentDriverBookings(driverId: string, limit = 8) {
    return Booking.find({
      currentDriverId: new Types.ObjectId(driverId),
      status: "complete",
    })
      .sort({ "trip.completedAt": -1, updatedAt: -1, createdAt: -1 })
      .limit(limit)
      .select(
        "bookingNumber customer pricing payment status createdAt updatedAt trip.completedAt route"
      )
      .lean();
  }

  findRecentWalletTransactions(driverId: string, limit = 12) {
    return WalletTransaction.find({ driverId: new Types.ObjectId(driverId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  async getAdminSeries() {
    const buckets = getMonthStarts();
    const since = buckets[0];

    const [revenueRows, userRows, driverRows, bookingRows] = await Promise.all([
      Payment.aggregate<{ _id: { year: number; month: number }; value: number }>([
        { $match: { status: "paid", createdAt: { $gte: since } } },
        {
          $group: {
            _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
            value: { $sum: "$amount" },
          },
        },
      ]),
      Customer.aggregate<{ _id: { year: number; month: number }; value: number }>([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
            value: { $sum: 1 },
          },
        },
      ]),
      Driver.aggregate<{ _id: { year: number; month: number }; value: number }>([
        { $match: { status: "approved", createdAt: { $gte: since } } },
        {
          $group: {
            _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
            value: { $sum: 1 },
          },
        },
      ]),
      Booking.aggregate<{ _id: { year: number; month: number }; value: number }>([
        { $match: { status: "complete", createdAt: { $gte: since } } },
        {
          $group: {
            _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
            value: { $sum: 1 },
          },
        },
      ]),
    ]);

    return {
      revenue: fillMonthlySeries(buckets, revenueRows),
      users: fillMonthlySeries(buckets, userRows),
      drivers: fillMonthlySeries(buckets, driverRows),
      completedBookings: fillMonthlySeries(buckets, bookingRows),
    };
  }

  async getDriverSeries(driverId: string) {
    const buckets = getMonthStarts();
    const since = buckets[0];
    const driverObjectId = new Types.ObjectId(driverId);

    const [earningsRows, activeRows, completedRows] = await Promise.all([
      WalletTransaction.aggregate<{ _id: { year: number; month: number }; value: number }>([
        {
          $match: {
            driverId: driverObjectId,
            direction: "credit",
            status: "completed",
            createdAt: { $gte: since },
          },
        },
        {
          $group: {
            _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
            value: { $sum: "$amount" },
          },
        },
      ]),
      Booking.aggregate<{ _id: { year: number; month: number }; value: number }>([
        {
          $match: {
            currentDriverId: driverObjectId,
            status: "accepted",
            createdAt: { $gte: since },
          },
        },
        {
          $group: {
            _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
            value: { $sum: 1 },
          },
        },
      ]),
      Booking.aggregate<{ _id: { year: number; month: number }; value: number }>([
        {
          $match: {
            currentDriverId: driverObjectId,
            status: "complete",
            createdAt: { $gte: since },
          },
        },
        {
          $group: {
            _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
            value: { $sum: 1 },
          },
        },
      ]),
    ]);

    const earnings = fillMonthlySeries(buckets, earningsRows);

    return {
      earnings,
      activeBookings: fillMonthlySeries(buckets, activeRows),
      completedBookings: fillMonthlySeries(buckets, completedRows),
      thisMonthEarned: earnings,
    };
  }

  // ─── User (customer) queries ─────────────────────────────────────────────

  /** Bookings belonging to the user — matched by email or createdBy userId */
  getUserBookingFilter(email: string, userId: string) {
    return {
      $or: [
        { "customer.email": email.toLowerCase() },
        { createdBy: new Types.ObjectId(userId) },
      ],
    };
  }

  countUserBookings(email: string, userId: string, extraMatch: Record<string, unknown> = {}) {
    return Booking.countDocuments({
      ...this.getUserBookingFilter(email, userId),
      ...extraMatch,
    });
  }

  findUserBookings(email: string, userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    return Booking.find(this.getUserBookingFilter(email, userId))
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select(
        "bookingNumber status category route vehicle pricing payment createdAt customer"
      )
      .lean();
  }

  findUserNextRides(email: string, userId: string, limit = 5) {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    return Booking.find({
      ...this.getUserBookingFilter(email, userId),
      "route.pickupDate": { $gte: today },
      status: { $in: ["pending", "confirmed", "accepted"] },
    })
      .sort({ "route.pickupDate": 1, "route.pickupTime": 1 })
      .limit(limit)
      .select("bookingNumber status route vehicle pricing createdAt")
      .lean();
  }

  async getUserTopDestinations(email: string, userId: string, limit = 5) {
    return Booking.aggregate<{ name: string; count: number }>([
      { $match: this.getUserBookingFilter(email, userId) },
      {
        $group: {
          _id: "$route.dropoffAddress",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: limit },
      { $project: { _id: 0, name: "$_id", count: 1 } },
    ]);
  }

  async getUserMonthlyChart(email: string, userId: string, months = 6) {
    const buckets = getMonthStarts(months);
    const since = buckets[0];
    const filter = this.getUserBookingFilter(email, userId);

    const [spendingRows, bookingRows] = await Promise.all([
      Booking.aggregate<{ _id: { year: number; month: number }; value: number }>([
        {
          $match: {
            ...filter,
            status: "complete",
            createdAt: { $gte: since },
          },
        },
        {
          $group: {
            _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
            value: { $sum: "$pricing.total" },
          },
        },
      ]),
      Booking.aggregate<{ _id: { year: number; month: number }; value: number }>([
        {
          $match: {
            ...filter,
            createdAt: { $gte: since },
          },
        },
        {
          $group: {
            _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
            value: { $sum: 1 },
          },
        },
      ]),
    ]);

    const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    return buckets.map((date) => {
      const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
      const spendMap = new Map(spendingRows.map((r) => [`${r._id.year}-${r._id.month}`, Number(r.value ?? 0)]));
      const bookMap = new Map(bookingRows.map((r) => [`${r._id.year}-${r._id.month}`, Number(r.value ?? 0)]));
      return {
        month: MONTH_NAMES[date.getMonth()],
        spending: Math.round((spendMap.get(key) ?? 0) * 100) / 100,
        bookings: bookMap.get(key) ?? 0,
      };
    });
  }

  findUserPayments(bookingIds: Types.ObjectId[], page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    return Payment.find({ bookingId: { $in: bookingIds } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: "bookingId", select: "bookingNumber" })
      .lean();
  }

  countUserPayments(bookingIds: Types.ObjectId[]) {
    return Payment.countDocuments({ bookingId: { $in: bookingIds } });
  }

  findUserBookingIds(email: string, userId: string) {
    return Booking.find(this.getUserBookingFilter(email, userId))
      .select("_id")
      .lean()
      .then((docs) => docs.map((d) => d._id as Types.ObjectId));
  }

  async deleteUserBooking(bookingId: string, email: string, userId: string) {
    if (!Types.ObjectId.isValid(bookingId)) {
      throw new AppError("Invalid booking ID", 400);
    }

    const filter = {
      _id: new Types.ObjectId(bookingId),
      ...this.getUserBookingFilter(email, userId),
    };

    const booking = await Booking.findOne(filter);
    if (!booking) {
      throw new AppError("Booking not found", 404);
    }

    await paymentRepository.deleteByBookingIds([bookingId]);
    await Assignment.deleteMany({ bookingId: new Types.ObjectId(bookingId) });
    await Booking.deleteOne({ _id: booking._id });

    return { message: "Booking deleted successfully" };
  }

  async bulkDeleteUserBookings(bookingIds: string[], email: string, userId: string) {
    const validIds = bookingIds.filter((id) => Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      throw new AppError("No valid booking IDs provided", 400);
    }

    const objectIds = validIds.map((id) => new Types.ObjectId(id));
    const filter = {
      _id: { $in: objectIds },
      ...this.getUserBookingFilter(email, userId),
    };

    const bookings = await Booking.find(filter).select("_id").lean();
    if (bookings.length === 0) {
      throw new AppError("No matching bookings found to delete", 404);
    }

    const matchedIds = bookings.map((b) => b._id.toString());
    const matchedObjectIds = bookings.map((b) => b._id);

    await paymentRepository.deleteByBookingIds(matchedIds);
    await Assignment.deleteMany({ bookingId: { $in: matchedObjectIds } });
    const deleteResult = await Booking.deleteMany({ _id: { $in: matchedObjectIds } });

    return {
      deletedCount: deleteResult.deletedCount,
      message: `${deleteResult.deletedCount} booking(s) deleted successfully`,
    };
  }

  async cancelUserBooking(bookingId: string, email: string, userId: string, reason?: string) {
    if (!Types.ObjectId.isValid(bookingId)) {
      throw new AppError("Invalid booking ID", 400);
    }

    const filter = {
      _id: new Types.ObjectId(bookingId),
      ...this.getUserBookingFilter(email, userId),
    };

    const booking = await Booking.findOne(filter);
    if (!booking) {
      throw new AppError("Booking not found", 404);
    }

    if (booking.status === "cancelled") {
      throw new AppError("Booking is already cancelled", 400);
    }

    if (booking.status === "complete") {
      throw new AppError("Cannot cancel a completed booking", 400);
    }

    booking.status = "cancelled";
    booking.timeline.push({
      event: "BOOKING_CANCELLED",
      at: new Date(),
      metadata: { reason: reason || "Cancelled by user" },
    });

    await booking.save();
    await Assignment.deleteMany({ bookingId: booking._id });

    return booking;
  }
}

export default new DashboardRepository();

