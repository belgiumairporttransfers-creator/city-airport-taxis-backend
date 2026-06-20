import { Router, type IRouter } from "express";
import newsletterController from "../controllers/newsletter.controller";
import { validateRequest, validateParams, validateQuery } from "@/middleware/validate";
import { bulkDeleteSchema, getAllQuerySchema } from "../validators/newsletter.validator";
import { idParamSchema } from "@/shared/validators/object-id.schema";

const adminNewsletterRoutes: IRouter = Router();

adminNewsletterRoutes.get("/", validateQuery(getAllQuerySchema), newsletterController.getAll);
adminNewsletterRoutes.delete(
  "/bulk",
  validateRequest(bulkDeleteSchema),
  newsletterController.bulkDelete
);
adminNewsletterRoutes.delete("/:id", validateParams(idParamSchema), newsletterController.deleteOne);

export default adminNewsletterRoutes;
