import { Router, type IRouter } from "express";
import notificationController from "../controllers/notification.controller";
import { validateParams, validateQuery } from "@/middleware/validate";
import {
  getNotificationsQuerySchema,
  notificationIdParamSchema,
} from "../validators/notification.validator";

const adminNotificationRoutes: IRouter = Router();

adminNotificationRoutes.get("/unread-count", notificationController.getUnreadCount);
adminNotificationRoutes.patch("/read-all", notificationController.markAllAsRead);
adminNotificationRoutes.get(
  "/",
  validateQuery(getNotificationsQuerySchema),
  notificationController.getAll
);
adminNotificationRoutes.patch(
  "/:id/read",
  validateParams(notificationIdParamSchema),
  notificationController.markAsRead
);
adminNotificationRoutes.delete(
  "/:id",
  validateParams(notificationIdParamSchema),
  notificationController.deleteOne
);

export default adminNotificationRoutes;
