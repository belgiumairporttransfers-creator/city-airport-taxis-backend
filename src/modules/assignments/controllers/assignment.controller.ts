import { Request, Response } from "express";
import assignmentService from "../services/assignment.service";
import {
  toAssignmentDetailResponse,
  toAssignmentResponse,
} from "../dto";
import { asyncHandler } from "@/middleware/asyncHandler";
import { sendSuccess } from "@/shared/utils/response";
import { AppError } from "@/shared/errors/AppError";
import type { CreateAssignmentData, GetAssignmentsQuery } from "../types/assignment.types";

class AssignmentController {
  getAll = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const result = await assignmentService.getAssignments(req.query as GetAssignmentsQuery);

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
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const { assignment, booking, driver, history } = await assignmentService.getAssignmentDetail(
      req.params.id
    );

    return sendSuccess(
      res,
      toAssignmentDetailResponse(assignment, booking, driver, history)
    );
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const assignment = await assignmentService.createAssignment(
      req.body as CreateAssignmentData,
      req.admin._id.toString()
    );

    return sendSuccess(res, toAssignmentResponse(assignment), {
      message: "Driver assigned successfully",
      statusCode: 201,
    });
  });

  cancel = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const assignment = await assignmentService.cancelAssignment(
      req.params.id,
      req.admin._id.toString()
    );

    return sendSuccess(res, toAssignmentResponse(assignment), {
      message: "Assignment cancelled successfully",
    });
  });

  reassign = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const assignment = await assignmentService.reassignAssignment(
      req.params.id,
      req.body as CreateAssignmentData,
      req.admin._id.toString()
    );

    return sendSuccess(res, toAssignmentResponse(assignment), {
      message: "Driver reassigned successfully",
      statusCode: 201,
    });
  });
}

export default new AssignmentController();
