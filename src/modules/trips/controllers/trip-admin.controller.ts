import { Request, Response } from "express";
import tripService from "../services/trip.service";
import { toAdminTripDetailResponse, toTripSummaryResponse } from "../dto";
import { asyncHandler } from "@/middleware/asyncHandler";
import { sendSuccess } from "@/shared/utils/response";
import { AppError } from "@/shared/errors/AppError";
import type { GetAdminTripsQuery } from "../types/trip.types";

class TripAdminController {
  getAll = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const result = await tripService.getAdminTrips(req.query as GetAdminTripsQuery);

    return sendSuccess(res, {
      items: result.items.map((item) => toTripSummaryResponse(item)),
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

    const { booking, assignment, driver } = await tripService.getAdminTripDetail(
      req.params.bookingNumber
    );

    return sendSuccess(res, toAdminTripDetailResponse(booking, assignment, driver));
  });
}

export default new TripAdminController();
