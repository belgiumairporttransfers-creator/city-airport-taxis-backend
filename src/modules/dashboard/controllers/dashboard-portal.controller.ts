import { Request, Response } from "express";
import dashboardService from "../services/dashboard.service";
import { asyncHandler } from "@/middleware/asyncHandler";
import { sendSuccess } from "@/shared/utils/response";
import { AppError } from "@/shared/errors/AppError";
import { DRIVER_ROLE } from "@/modules/auth/types/auth.types";

class DashboardPortalController {
  private assertDriver(req: Request) {
    if (!req.user || req.user.role !== DRIVER_ROLE) {
      throw new AppError("This endpoint is for driver accounts only", 403);
    }

    return req.user._id.toString();
  }

  getOverview = asyncHandler(async (req: Request, res: Response) => {
    const driverUserId = this.assertDriver(req);
    const overview = await dashboardService.getDriverOverview(driverUserId);
    return sendSuccess(res, overview);
  });
}

export default new DashboardPortalController();
