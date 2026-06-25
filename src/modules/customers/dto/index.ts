import type { ICustomer } from "@/modules/customers/types/customer.types";
import type { CustomerResponse } from "@/modules/customers/types/customer.types";

type CustomerLike = ICustomer | (Record<string, unknown> & { _id: unknown });

const toIdString = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "toString" in value) {
    return String(value);
  }
  return undefined;
};

const toIsoString = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return undefined;
};

export const toCustomerResponse = (customer: CustomerLike): CustomerResponse => {
  const record =
    typeof (customer as ICustomer).toObject === "function"
      ? ((customer as ICustomer).toObject() as Record<string, unknown>)
      : (customer as Record<string, unknown>);

  return {
    _id: toIdString(record._id) ?? "",
    customerType: record.customerType as CustomerResponse["customerType"],
    tier: record.tier as CustomerResponse["tier"],
    status: record.status as CustomerResponse["status"],
    firstName: record.firstName as string | undefined,
    lastName: record.lastName as string | undefined,
    companyName: record.companyName as string | undefined,
    email: record.email as string,
    phone: record.phone as string,
    alternatePhone: record.alternatePhone as string | undefined,
    billingAddress: record.billingAddress as CustomerResponse["billingAddress"],
    vatNumber: record.vatNumber as string | undefined,
    notes: record.notes as string | undefined,
    tags: (record.tags as string[] | undefined) ?? [],
    marketingOptIn: Boolean(record.marketingOptIn),
    userId: toIdString(record.userId),
    createdBy: toIdString(record.createdBy),
    updatedBy: toIdString(record.updatedBy),
    totalBookings: Number(record.totalBookings ?? 0),
    totalSpend: Number(record.totalSpend ?? 0),
    lastBookingAt: toIsoString(record.lastBookingAt),
    createdAt: toIsoString(record.createdAt) ?? "",
    updatedAt: toIsoString(record.updatedAt) ?? "",
  };
};
