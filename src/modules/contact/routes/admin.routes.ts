import { Router, type IRouter } from "express";
import contactController from "../controllers/contact.controller";
import { validateRequest, validateParams, validateQuery } from "@/middleware/validate";
import { bulkDeleteSchema, getAllQuerySchema } from "../validators/contact.validator";
import { idParamSchema } from "@/shared/validators/object-id.schema";

const adminContactRoutes: IRouter = Router();

adminContactRoutes.get("/", validateQuery(getAllQuerySchema), contactController.getAll);
adminContactRoutes.delete(
  "/bulk",
  validateRequest(bulkDeleteSchema),
  contactController.bulkDelete
);
adminContactRoutes.delete("/:id", validateParams(idParamSchema), contactController.deleteOne);

export default adminContactRoutes;
