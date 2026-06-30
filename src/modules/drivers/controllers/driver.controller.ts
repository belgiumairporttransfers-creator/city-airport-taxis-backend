import { Request, Response } from "express";
import driverService from "../services/driver.service";
import { toDriverResponse } from "../dto";
import { asyncHandler } from "@/middleware/asyncHandler";
import { sendSuccess } from "@/shared/utils/response";
import { AppError } from "@/shared/errors/AppError";
import type { GetDriversQuery } from "../types/driver.types";

class DriverController {
  getAll = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const result = await driverService.getApplications(req.query as GetDriversQuery);

    return sendSuccess(res, {
      items: result.items.map((item) =>
        toDriverResponse(item, { includeReviews: false })
      ),
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const application = await driverService.createApplicationByAdmin(
      req.body,
      req.admin._id.toString()
    );

    return sendSuccess(res, toDriverResponse(application), {
      message: "Driver application created successfully",
      statusCode: 201,
    });
  });

  getStats = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const stats = await driverService.getApplicationStats();

    return sendSuccess(res, stats);
  });

  getOne = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const application = await driverService.getApplication(req.params.id);

    return sendSuccess(res, toDriverResponse(application));
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const application = await driverService.updateApplication(
      req.params.id,
      req.body,
      req.admin._id.toString()
    );

    return sendSuccess(res, toDriverResponse(application), {
      message: "Driver application updated successfully",
    });
  });

  startReview = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const application = await driverService.startReview(req.params.id, req.admin._id.toString());

    return sendSuccess(res, toDriverResponse(application), {
      message: "Driver application moved to under review",
    });
  });

  requestChanges = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const application = await driverService.requestChanges(
      req.params.id,
      req.body.reviewNotes,
      req.admin._id.toString()
    );

    return sendSuccess(res, toDriverResponse(application), {
      message: "Changes requested from driver",
    });
  });

  approve = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const application = await driverService.approveApplication(
      req.params.id,
      req.admin._id.toString()
    );

    return sendSuccess(res, toDriverResponse(application), {
      message: "Driver application approved successfully",
    });
  });

  reject = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const application = await driverService.rejectApplication(
      req.params.id,
      req.body.reviewNotes,
      req.admin._id.toString()
    );

    return sendSuccess(res, toDriverResponse(application), {
      message: "Driver application rejected",
    });
  });

  suspend = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const application = await driverService.suspendDriver(
      req.params.id,
      req.admin._id.toString(),
      req.body.reviewNotes
    );

    return sendSuccess(res, toDriverResponse(application), {
      message: "Driver suspended successfully",
    });
  });
}

export default new DriverController();
