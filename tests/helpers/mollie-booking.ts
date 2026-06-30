import { vi } from "vitest";
import request from "supertest";
import mollieClient from "@/modules/payments/utils/mollie.client";
import { Booking } from "@/infrastructure/database/models/Booking";
import { Payment } from "@/infrastructure/database/models/Payment";

export const mockMollieCreatePayment = (providerPaymentId: string, checkoutUrl?: string) => {
  vi.mocked(mollieClient.createPayment).mockResolvedValue({
    id: providerPaymentId,
    status: "open",
    amount: { value: "85.00", currency: "EUR" },
    description: "Booking",
    _links: { checkout: { href: checkoutUrl ?? "https://checkout.mollie.com/test" } },
  });
};

export const mockMollieGetPayment = (
  providerPaymentId: string,
  options: {
    status: "paid" | "failed" | "expired" | "canceled" | "open" | "pending";
    internalPaymentId: string;
    cardNumber?: string;
  }
) => {
  vi.mocked(mollieClient.getPayment).mockImplementation(async (id) => {
    if (id !== providerPaymentId) {
      throw new Error(`Unexpected Mollie payment id: ${id}`);
    }

    return {
      id: providerPaymentId,
      status: options.status,
      amount: { value: "85.00", currency: "EUR" },
      description: "Booking",
      metadata: {
        paymentId: options.internalPaymentId,
      },
      ...(options.cardNumber ? { details: { cardNumber: options.cardNumber } } : {}),
    };
  });
};

export const mockMolliePaidPayment = (providerPaymentId: string, internalPaymentId: string) => {
  mockMollieGetPayment(providerPaymentId, {
    status: "paid",
    internalPaymentId,
    cardNumber: "6787",
  });
};

export const confirmMolliePayment = async (
  publicAgent: request.SuperAgentTest,
  providerPaymentId: string,
  internalPaymentId: string
) => {
  mockMolliePaidPayment(providerPaymentId, internalPaymentId);

  const response = await publicAgent
    .post("/api/payments/mollie/webhook")
    .send({ id: providerPaymentId });

  expect(response.status).toBe(200);
};

export const createPaidMollieBooking = async (
  publicAgent: request.SuperAgentTest,
  payload: Record<string, unknown>,
  providerPaymentId = "tr_test_paid"
) => {
  mockMollieCreatePayment(providerPaymentId);

  const response = await publicAgent.post("/api/bookings").send(payload);

  expect(response.status).toBe(200);
  expect(response.body.data.checkoutUrl).toBeDefined();

  const bookingId = response.body.data.bookingId as string;
  const payment = await Payment.findOne({ bookingId });
  expect(payment).toBeTruthy();

  await confirmMolliePayment(publicAgent, providerPaymentId, payment!._id.toString());

  const booking = await Booking.findById(bookingId);
  expect(booking?.status).toBe("confirmed");

  return {
    response,
    booking: booking!,
    bookingId,
    bookingNumber: booking!.bookingNumber,
    providerPaymentId,
    paymentId: payment!._id.toString(),
  };
};
