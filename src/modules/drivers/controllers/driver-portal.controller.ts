import { Request, Response } from "express";
import driverService from "../services/driver.service";
import { toDriverApplicationResponse } from "../dto";
import { asyncHandler } from "@/middleware/asyncHandler";
import { sendSuccess } from "@/shared/utils/response";
import { AppError } from "@/shared/errors/AppError";
import { DRIVER_ROLE } from "@/modules/auth/types/auth.types";

class DriverPortalController {
  getMyApplication = asyncHandler(async (req: Request, res: Response) => {
    if (req.user!.role !== DRIVER_ROLE) {
      throw new AppError("This endpoint is for driver accounts only", 403);
    }

    const application = await driverService.getApplicationForUser(req.user!._id.toString());

    return sendSuccess(res, toDriverApplicationResponse(application));
  });

  updateMyApplication = asyncHandler(async (req: Request, res: Response) => {
    if (req.user!.role !== DRIVER_ROLE) {
      throw new AppError("This endpoint is for driver accounts only", 403);
    }

    const application = await driverService.updateApplicationForUser(
      req.user!._id.toString(),
      req.body
    );

    return sendSuccess(res, toDriverApplicationResponse(application), {
      message: "Profile updated successfully",
    });
  });
}

export default new DriverPortalController();
