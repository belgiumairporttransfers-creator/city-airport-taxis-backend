export interface AdminDashboardTotals {
  revenue: number;
  users: number;
  drivers: number;
  completedBookings: number;
}

export interface DriverDashboardTotals {
  totalEarned: number;
  availableBalance: number;
  thisMonthEarned: number;
  activeBookings: number;
  completedBookings: number;
  totalTrips: number;
  currency: string;
}

export interface DashboardSeries {
  revenue?: number[];
  users?: number[];
  drivers?: number[];
  completedBookings?: number[];
  earnings?: number[];
  activeBookings?: number[];
}

export interface AdminDashboardPaymentItem {
  id: string;
  name: string;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

export interface AdminDashboardOrderItem {
  id: string;
  bookingNumber: string;
  customerName: string;
  date: string;
  amount: number;
  paymentStatus: string;
  status: string;
}

export interface DriverDashboardTransactionItem {
  id: string;
  name: string;
  reference: string;
  amount: number;
  currency: string;
  direction: string;
  type: string;
  status: string;
  createdAt: string;
}

export interface DriverDashboardOrderItem {
  id: string;
  bookingNumber: string;
  customerName: string;
  date: string;
  amount: number;
  status: string;
  isComplete: boolean;
}

export interface AdminDashboardOverview {
  totals: AdminDashboardTotals;
  series: {
    revenue: number[];
    users: number[];
    drivers: number[];
    completedBookings: number[];
  };
  payments: AdminDashboardPaymentItem[];
  recentOrders: AdminDashboardOrderItem[];
}

export interface DriverDashboardOverview {
  totals: DriverDashboardTotals;
  series: {
    earnings: number[];
    activeBookings: number[];
    completedBookings: number[];
    thisMonthEarned: number[];
  };
  transactions: DriverDashboardTransactionItem[];
  recentOrders: DriverDashboardOrderItem[];
}
