import { Request, Response } from "express";
import dashboardService from "../services/dashboard.service";
import { asyncHandler } from "@/middleware/asyncHandler";
import { sendSuccess } from "@/shared/utils/response";
import { AppError } from "@/shared/errors/AppError";

class DashboardAdminController {
  getOverview = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const overview = await dashboardService.getAdminOverview();
    return sendSuccess(res, overview);
  });
}

export default new DashboardAdminController();
