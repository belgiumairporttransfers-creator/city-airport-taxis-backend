import type { Document, Types } from "mongoose";

export const CUSTOMER_TYPES = ["individual", "corporate"] as const;
export type CustomerType = (typeof CUSTOMER_TYPES)[number];

export const CUSTOMER_TIERS = ["standard", "vip"] as const;
export type CustomerTier = (typeof CUSTOMER_TIERS)[number];

export const CUSTOMER_STATUSES = ["active", "suspended", "archived"] as const;
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export interface ICustomerBillingAddress {
  street?: string;
  city?: string;
  postcode?: string;
  country?: string;
}

export interface ICustomer extends Document {
  customerType: CustomerType;
  tier: CustomerTier;
  status: CustomerStatus;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  billingAddress?: ICustomerBillingAddress;
  vatNumber?: string;
  notes?: string;
  tags: string[];
  marketingOptIn: boolean;
  userId?: Types.ObjectId;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  totalBookings: number;
  totalSpend: number;
  lastBookingAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCustomerData {
  customerType: CustomerType;
  tier?: CustomerTier;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  billingAddress?: ICustomerBillingAddress;
  vatNumber?: string;
  notes?: string;
  tags?: string[];
  marketingOptIn?: boolean;
  userId?: string;
}

export interface UpdateCustomerData {
  customerType?: CustomerType;
  tier?: CustomerTier;
  status?: CustomerStatus;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  billingAddress?: ICustomerBillingAddress;
  vatNumber?: string;
  notes?: string;
  tags?: string[];
  marketingOptIn?: boolean;
  userId?: string | null;
}

export interface GetCustomersQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: CustomerStatus;
  customerType?: CustomerType;
  tier?: CustomerTier;
  sort?: string;
}

export interface CustomerResponse {
  _id: string;
  customerType: CustomerType;
  tier: CustomerTier;
  status: CustomerStatus;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  billingAddress?: ICustomerBillingAddress;
  vatNumber?: string;
  notes?: string;
  tags: string[];
  marketingOptIn: boolean;
  userId?: string;
  createdBy?: string;
  updatedBy?: string;
  totalBookings: number;
  totalSpend: number;
  lastBookingAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerListResponse {
  items: CustomerResponse[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CustomerStatusCount {
  status: CustomerStatus;
  count: number;
}
