import { Request, Response } from "express";
import tripService from "../services/trip.service";
import {
  toDriverTripDetailResponse,
  toDriverTripListResponse,
  toTripSummaryResponse,
} from "../dto";
import { asyncHandler } from "@/middleware/asyncHandler";
import { sendSuccess } from "@/shared/utils/response";
import { AppError } from "@/shared/errors/AppError";
import { DRIVER_ROLE } from "@/modules/auth/types/auth.types";

class TripPortalController {
  private assertDriver(req: Request) {
    if (!req.user || req.user.role !== DRIVER_ROLE) {
      throw new AppError("This endpoint is for driver accounts only", 403);
    }

    return req.user._id.toString();
  }

  getAll = asyncHandler(async (req: Request, res: Response) => {
    const driverUserId = this.assertDriver(req);
    const bookings = await tripService.getDriverTrips(driverUserId);

    return sendSuccess(res, toDriverTripListResponse(bookings));
  });

  getOne = asyncHandler(async (req: Request, res: Response) => {
    const driverUserId = this.assertDriver(req);
    const { booking, assignment } = await tripService.getDriverTripDetail(
      req.params.bookingRef,
      driverUserId
    );

    return sendSuccess(res, toDriverTripDetailResponse(booking, assignment));
  });

  markArrived = asyncHandler(async (req: Request, res: Response) => {
    const driverUserId = this.assertDriver(req);
    const booking = await tripService.markArrived(req.params.bookingRef, driverUserId);

    return sendSuccess(res, toTripSummaryResponse(booking), {
      message: "Driver arrival recorded successfully",
    });
  });

  markPassengerOnboard = asyncHandler(async (req: Request, res: Response) => {
    const driverUserId = this.assertDriver(req);
    const booking = await tripService.markPassengerOnboard(
      req.params.bookingRef,
      driverUserId
    );

    return sendSuccess(res, toTripSummaryResponse(booking), {
      message: "Passenger onboard recorded successfully",
    });
  });

  start = asyncHandler(async (req: Request, res: Response) => {
    const driverUserId = this.assertDriver(req);
    const booking = await tripService.startTrip(req.params.bookingRef, driverUserId);

    return sendSuccess(res, toTripSummaryResponse(booking), {
      message: "Trip started successfully",
    });
  });

  complete = asyncHandler(async (req: Request, res: Response) => {
    const driverUserId = this.assertDriver(req);
    const booking = await tripService.completeTrip(req.params.bookingRef, driverUserId);

    return sendSuccess(res, toTripSummaryResponse(booking), {
      message: "Trip completed successfully",
    });
  });
}

export default new TripPortalController();
