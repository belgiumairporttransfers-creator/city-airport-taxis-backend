import { Request, Response } from "express";
import bookingService from "../services/booking.service";
import paymentService from "@/modules/payments/services/payment.service";
import { toPublicBookingStatusResponse } from "../dto";
import { asyncHandler } from "@/middleware/asyncHandler";
import { sendSuccess } from "@/shared/utils/response";

class BookingPublicController {
  create = asyncHandler(async (req: Request, res: Response) => {
    const result = await bookingService.createBooking(req.body);

    return sendSuccess(res, {
      bookingId: result.booking._id.toString(),
      checkoutUrl: result.checkoutUrl,
      amount: result.booking.pricing.total,
    });
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    await paymentService.syncBookingPaymentStatus(req.params.id);
    const booking = await bookingService.getBooking(req.params.id);
    const vehicleImage = await bookingService.resolveVehicleImage(booking);

    return sendSuccess(res, toPublicBookingStatusResponse(booking, { vehicleImage }));
  });
}

export default new BookingPublicController();
