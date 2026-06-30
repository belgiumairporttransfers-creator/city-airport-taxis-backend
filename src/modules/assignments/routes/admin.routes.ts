import { Router, type IRouter } from "express";
import assignmentController from "../controllers/assignment.controller";
import { validateParams, validateQuery, validateRequest } from "@/middleware/validate";
import {
  assignmentIdParamSchema,
  createAssignmentSchema,
  getAssignmentsQuerySchema,
  reassignAssignmentSchema,
} from "../validators/assignment.validator";

const adminAssignmentRoutes: IRouter = Router();

adminAssignmentRoutes.get(
  "/",
  validateQuery(getAssignmentsQuerySchema),
  assignmentController.getAll
);

adminAssignmentRoutes.get(
  "/:id",
  validateParams(assignmentIdParamSchema),
  assignmentController.getOne
);

adminAssignmentRoutes.post("/", validateRequest(createAssignmentSchema), assignmentController.create);

adminAssignmentRoutes.post(
  "/:id/cancel",
  validateParams(assignmentIdParamSchema),
  assignmentController.cancel
);

adminAssignmentRoutes.post(
  "/:id/reassign",
  validateParams(assignmentIdParamSchema),
  validateRequest(reassignAssignmentSchema),
  assignmentController.reassign
);

export default adminAssignmentRoutes;
