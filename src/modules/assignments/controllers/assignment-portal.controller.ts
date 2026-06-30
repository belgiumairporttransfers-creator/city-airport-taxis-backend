import { Request, Response } from "express";
import assignmentService from "../services/assignment.service";
import { toAssignmentResponse, toDriverAssignmentDetailResponse } from "../dto";
import settingsService from "@/modules/settings/services/settings.service";
import { asyncHandler } from "@/middleware/asyncHandler";
import { sendSuccess } from "@/shared/utils/response";
import { AppError } from "@/shared/errors/AppError";
import { DRIVER_ROLE } from "@/modules/auth/types/auth.types";
import type { GetDriverAssignmentsQuery, RejectAssignmentData } from "../types/assignment.types";

class AssignmentPortalController {
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
    const result = await assignmentService.getDriverAssignments(
      driverUserId,
      req.query as GetDriverAssignmentsQuery
    );

    return sendSuccess(res, {
      items: result.items.map((item) => toAssignmentResponse(item)),
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
    const { assignment, booking } = await assignmentService.getDriverAssignmentDetail(
      req.params.id,
      driverUserId
    );

    return sendSuccess(
      res,
      toDriverAssignmentDetailResponse(assignment, booking, commissionPercent)
    );
  });

  accept = asyncHandler(async (req: Request, res: Response) => {
    const driverUserId = this.assertDriver(req);
    const assignment = await assignmentService.acceptAssignment(req.params.id, driverUserId);

    return sendSuccess(res, toAssignmentResponse(assignment), {
      message: "Assignment accepted successfully",
    });
  });

  reject = asyncHandler(async (req: Request, res: Response) => {
    const driverUserId = this.assertDriver(req);
    const assignment = await assignmentService.rejectAssignment(
      req.params.id,
      driverUserId,
      req.body as RejectAssignmentData
    );

    return sendSuccess(res, toAssignmentResponse(assignment), {
      message: "Assignment rejected successfully",
    });
  });
}

export default new AssignmentPortalController();
