import { Request, Response } from "express";
import bookingAdminService from "../services/booking-admin.service";
import { toAdminBookingDetailResponse, toBookingResponse } from "../dto";
import { asyncHandler } from "@/middleware/asyncHandler";
import { sendSuccess } from "@/shared/utils/response";
import { AppError } from "@/shared/errors/AppError";
import type { GetBookingsQuery, UpdateBookingData } from "../types/booking.types";
import type { IPayment } from "@/modules/payments/types/payment.types";

const toPaymentRecord = (payment: IPayment | null | undefined) => {
  if (!payment) return null;
  if (typeof payment.toObject === "function") {
    return payment.toObject() as Record<string, unknown>;
  }
  return payment as unknown as Record<string, unknown>;
};

class BookingController {
  getAll = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const result = await bookingAdminService.getBookings(req.query as GetBookingsQuery);

    return sendSuccess(res, {
      items: result.items.map((item) => toBookingResponse(item)),
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  });

  getOne = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const { booking, payment } = await bookingAdminService.getBookingDetail(req.params.id);

    return sendSuccess(
      res,
      toAdminBookingDetailResponse(booking, toPaymentRecord(payment))
    );
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const { booking, payment } = await bookingAdminService.updateBooking(
      req.params.id,
      req.body as UpdateBookingData,
      req.admin._id.toString()
    );

    return sendSuccess(
      res,
      toAdminBookingDetailResponse(booking, toPaymentRecord(payment)),
      { message: "Booking updated successfully" }
    );
  });

  confirm = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const { booking, payment } = await bookingAdminService.confirmBooking(
      req.params.id,
      req.admin._id.toString()
    );

    return sendSuccess(
      res,
      toAdminBookingDetailResponse(booking, toPaymentRecord(payment)),
      { message: "Booking confirmed successfully" }
    );
  });

  cancel = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const { booking, payment } = await bookingAdminService.cancelBooking(
      req.params.id,
      req.admin._id.toString(),
      req.body?.reason
    );

    return sendSuccess(
      res,
      toAdminBookingDetailResponse(booking, toPaymentRecord(payment)),
      { message: "Booking cancelled successfully" }
    );
  });

  markNoShow = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const { booking, payment } = await bookingAdminService.markNoShow(
      req.params.id,
      req.admin._id.toString()
    );

    return sendSuccess(
      res,
      toAdminBookingDetailResponse(booking, toPaymentRecord(payment)),
      { message: "Booking marked as no-show" }
    );
  });

  deleteOne = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const deleted = await bookingAdminService.deleteBooking(
      req.params.id,
      req.admin._id.toString()
    );

    return sendSuccess(res, { id: deleted._id.toString() }, {
      message: "Booking deleted successfully",
    });
  });

  bulkDelete = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const result = await bookingAdminService.bulkDeleteBookings(
      req.body.ids as string[],
      req.admin._id.toString()
    );

    return sendSuccess(res, result, {
      message:
        result.deletedCount === 1
          ? "Booking deleted successfully"
          : `${result.deletedCount} bookings deleted successfully`,
    });
  });
}

export default new BookingController();
