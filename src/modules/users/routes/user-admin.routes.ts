import { Router, type IRouter } from "express";
import userAdminController from "../controllers/user-admin.controller";
import { validateParams, validateQuery, validateRequest } from "@/middleware/validate";
import {
  getUsersQuerySchema,
  updateUserStatusSchema,
  bulkDeleteUsersSchema,
} from "../validators/user-admin.validator";
import { idParamSchema } from "@/shared/validators/object-id.schema";

const adminUserRoutes: IRouter = Router();

adminUserRoutes.get("/", validateQuery(getUsersQuerySchema), userAdminController.getAll);
adminUserRoutes.get("/stats", userAdminController.getStats);
adminUserRoutes.post(
  "/bulk-delete",
  validateRequest(bulkDeleteUsersSchema),
  userAdminController.bulkDelete
);
adminUserRoutes.delete(
  "/bulk",
  validateRequest(bulkDeleteUsersSchema),
  userAdminController.bulkDelete
);
adminUserRoutes.get("/:id", validateParams(idParamSchema), userAdminController.getOne);
adminUserRoutes.delete("/:id", validateParams(idParamSchema), userAdminController.delete);
adminUserRoutes.patch(
  "/:id/status",
  validateParams(idParamSchema),
  validateRequest(updateUserStatusSchema),
  userAdminController.updateStatus
);

export default adminUserRoutes;
