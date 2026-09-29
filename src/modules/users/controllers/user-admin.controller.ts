import { Request, Response } from "express";
import userAdminService from "../services/user-admin.service";
import { asyncHandler } from "@/middleware/asyncHandler";
import { sendSuccess } from "@/shared/utils/response";
import { AppError } from "@/shared/errors/AppError";
import type { GetUsersQuery } from "../types/user-admin.types";

class UserAdminController {
  getAll = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const result = await userAdminService.getUsers(req.query as GetUsersQuery);

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

  getStats = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const stats = await userAdminService.getUserStats();
    return sendSuccess(res, stats);
  });

  getOne = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const user = await userAdminService.getUser(req.params.id);
    return sendSuccess(res, user);
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const result = await userAdminService.deleteUser(
      req.params.id,
      req.admin._id.toString()
    );

    return sendSuccess(res, undefined, {
      message: result.message,
    });
  });

  bulkDelete = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const result = await userAdminService.bulkDeleteUsers(
      req.body.ids as string[],
      req.admin._id.toString()
    );

    return sendSuccess(res, { deletedCount: result.deletedCount }, {
      message: result.message,
    });
  });

  updateStatus = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const { status, reason } = req.body;
    const user = await userAdminService.updateUserStatus(
      req.params.id,
      status,
      reason
    );

    return sendSuccess(res, user, {
      message: `User status updated to ${status}`,
    });
  });
}

export default new UserAdminController();
