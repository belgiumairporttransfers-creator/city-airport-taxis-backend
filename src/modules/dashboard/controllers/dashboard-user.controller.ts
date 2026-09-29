import { Request, Response } from "express";
import dashboardService from "../services/dashboard.service";
import { asyncHandler } from "@/middleware/asyncHandler";
import { sendSuccess } from "@/shared/utils/response";
import { AppError } from "@/shared/errors/AppError";
import { USER_ROLE } from "@/modules/auth/types/auth.types";

class DashboardUserController {
  private assertUser(req: Request) {
    if (!req.user || req.user.role !== USER_ROLE) {
      throw new AppError("This endpoint is for user accounts only", 403);
    }
    return { userId: req.user._id.toString(), email: req.user.email };
  }

  getOverview = asyncHandler(async (req: Request, res: Response) => {
    const { userId, email } = this.assertUser(req);
    const months = Number(req.query.months) || 6;
    const overview = await dashboardService.getUserOverview(email, userId, months);
    return sendSuccess(res, overview);
  });

  getBookings = asyncHandler(async (req: Request, res: Response) => {
    const { userId, email } = this.assertUser(req);
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const result = await dashboardService.getUserBookings(email, userId, page, limit);
    return sendSuccess(res, {
      items: result.items,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  });

  getPayments = asyncHandler(async (req: Request, res: Response) => {
    const { userId, email } = this.assertUser(req);
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const result = await dashboardService.getUserPayments(email, userId, page, limit);
    return sendSuccess(res, {
      items: result.items,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  });

  deleteBooking = asyncHandler(async (req: Request, res: Response) => {
    const { userId, email } = this.assertUser(req);
    const { id } = req.params;
    const result = await dashboardService.deleteUserBooking(id, email, userId);
    return sendSuccess(res, result);
  });

  bulkDeleteBookings = asyncHandler(async (req: Request, res: Response) => {
    const { userId, email } = this.assertUser(req);
    const bookingIds: string[] = req.body.bookingIds || req.body.ids || [];
    if (!Array.isArray(bookingIds) || bookingIds.length === 0) {
      throw new AppError("bookingIds must be a non-empty array", 400);
    }
    const result = await dashboardService.bulkDeleteUserBookings(bookingIds, email, userId);
    return sendSuccess(res, result);
  });

  cancelBooking = asyncHandler(async (req: Request, res: Response) => {
    const { userId, email } = this.assertUser(req);
    const { id } = req.params;
    const { reason } = req.body;
    const result = await dashboardService.cancelUserBooking(id, email, userId, reason);
    return sendSuccess(res, result, { message: "Booking cancelled successfully" });
  });
}

export default new DashboardUserController();
