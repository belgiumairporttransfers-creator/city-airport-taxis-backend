import { Router, type IRouter } from "express";
import { protectUser } from "@/middleware/auth";
import assignmentPortalController from "../controllers/assignment-portal.controller";
import { validateParams, validateQuery, validateRequest } from "@/middleware/validate";
import {
  assignmentIdParamSchema,
  getDriverAssignmentsQuerySchema,
  rejectAssignmentSchema,
} from "../validators/assignment.validator";

const portalAssignmentRoutes: IRouter = Router();

portalAssignmentRoutes.use(protectUser);

portalAssignmentRoutes.get(
  "/assignments",
  validateQuery(getDriverAssignmentsQuerySchema),
  assignmentPortalController.getAll
);

portalAssignmentRoutes.get(
  "/assignments/:id",
  validateParams(assignmentIdParamSchema),
  assignmentPortalController.getOne
);

portalAssignmentRoutes.post(
  "/assignments/:id/accept",
  validateParams(assignmentIdParamSchema),
  assignmentPortalController.accept
);

portalAssignmentRoutes.post(
  "/assignments/:id/reject",
  validateParams(assignmentIdParamSchema),
  validateRequest(rejectAssignmentSchema),
  assignmentPortalController.reject
);

export default portalAssignmentRoutes;
