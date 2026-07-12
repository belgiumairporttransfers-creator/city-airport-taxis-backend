import { Types } from "mongoose";
import { Booking } from "@/infrastructure/database/models/Booking";
import { Customer } from "@/infrastructure/database/models/Customer";
import { Driver } from "@/infrastructure/database/models/Driver";
import { Payment } from "@/infrastructure/database/models/Payment";
import { WalletTransaction } from "@/infrastructure/database/models/WalletTransaction";

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
      assignmentStatus: { $in: ["accepted", "completed"] },
      status: { $in: ["accepted", "complete"] },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("bookingNumber customer pricing status createdAt route")
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
}

export default new DashboardRepository();
