import { Request, Response } from "express";
import bookingPortalService from "../services/booking-portal.service";
import { toAssignmentResponse } from "@/modules/assignments/dto";
import {
  toDriverBookingResponse,
  toDriverOpenBookingDetailResponse,
} from "../dto";
import settingsService from "@/modules/settings/services/settings.service";
import { asyncHandler } from "@/middleware/asyncHandler";
import { sendSuccess } from "@/shared/utils/response";
import { AppError } from "@/shared/errors/AppError";
import { DRIVER_ROLE } from "@/modules/auth/types/auth.types";
import type { GetDriverBookingsQuery } from "../types/booking.types";

class BookingPortalController {
  private assertDriver(req: Request) {
    if (!req.user || req.user.role !== DRIVER_ROLE) {
      throw new AppError("This endpoint is for driver accounts only", 403);
    }

    return req.user._id.toString();
  }

  private async getCommissionPercent() {
    const settings = await settingsService.getSettings();
    return Number(settings.driverCommissionPercent ?? 10);
  }

  getAll = asyncHandler(async (req: Request, res: Response) => {
    const driverUserId = this.assertDriver(req);
    const commissionPercent = await this.getCommissionPercent();
    const result = await bookingPortalService.getDriverBookings(
      driverUserId,
      req.query as GetDriverBookingsQuery
    );

    return sendSuccess(res, {
      items: result.items.map((item) => toDriverBookingResponse(item, commissionPercent)),
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  });

  getOne = asyncHandler(async (req: Request, res: Response) => {
    const driverUserId = this.assertDriver(req);
    const commissionPercent = await this.getCommissionPercent();
    const result = await bookingPortalService.getDriverBookingDetail(
      req.params.id,
      driverUserId
    );

    return sendSuccess(
      res,
      toDriverOpenBookingDetailResponse(
        result.booking,
        result.canAccept,
        commissionPercent,
        result.assignmentId,
        result.unavailableMessage
      )
    );
  });

  accept = asyncHandler(async (req: Request, res: Response) => {
    const driverUserId = this.assertDriver(req);
    const commissionPercent = await this.getCommissionPercent();
    const result = await bookingPortalService.acceptOpenBooking(req.params.id, driverUserId);

    return sendSuccess(
      res,
      {
        booking: toDriverOpenBookingDetailResponse(
          result.booking,
          false,
          commissionPercent,
          result.assignment._id.toString()
        ),
        assignment: toAssignmentResponse(result.assignment),
      },
      { message: "Booking accepted successfully" }
    );
  });
}

export default new BookingPortalController();
