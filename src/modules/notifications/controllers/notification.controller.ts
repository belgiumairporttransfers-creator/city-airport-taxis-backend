import { Request, Response } from "express";
import notificationService from "../services/notification.service";
import { toNotificationResponse } from "../dto";
import { asyncHandler } from "@/middleware/asyncHandler";
import { sendSuccess } from "@/shared/utils/response";
import { AppError } from "@/shared/errors/AppError";
import type { GetNotificationsQuery } from "../types/notification.types";

class NotificationController {
  getAll = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const adminId = req.admin._id.toString();
    const result = await notificationService.getNotifications(
      adminId,
      req.query as GetNotificationsQuery
    );

    return sendSuccess(res, {
      items: result.items.map((item) => toNotificationResponse(item)),
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  });

  getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const count = await notificationService.getUnreadCount(req.admin._id.toString());

    return sendSuccess(res, { count });
  });

  markAsRead = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const notification = await notificationService.markAsRead(
      req.params.id,
      req.admin._id.toString()
    );

    return sendSuccess(res, toNotificationResponse(notification), {
      message: "Notification marked as read",
    });
  });

  markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    await notificationService.markAllAsRead(req.admin._id.toString());

    return sendSuccess(
      res,
      { success: true },
      {
        message: "All notifications marked as read",
      }
    );
  });

  deleteOne = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    await notificationService.deleteNotification(req.params.id, req.admin._id.toString());

    return sendSuccess(
      res,
      { success: true },
      {
        message: "Notification deleted",
      }
    );
  });
}

export default new NotificationController();
