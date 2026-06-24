import { Router, type IRouter } from "express";
import newsletterDraftController from "../controllers/newsletter-draft.controller";
import { validateRequest, validateParams, validateQuery } from "@/middleware/validate";
import {
  bulkDeleteDraftsSchema,
  getDraftsQuerySchema,
  saveDraftSchema,
  updateDraftSchema,
} from "../validators/newsletter-draft.validator";
import { idParamSchema } from "@/shared/validators/object-id.schema";

const adminNewsletterDraftRoutes: IRouter = Router();

adminNewsletterDraftRoutes.get(
  "/",
  validateQuery(getDraftsQuerySchema),
  newsletterDraftController.getAll
);
adminNewsletterDraftRoutes.post("/", validateRequest(saveDraftSchema), newsletterDraftController.create);
adminNewsletterDraftRoutes.delete(
  "/bulk",
  validateRequest(bulkDeleteDraftsSchema),
  newsletterDraftController.bulkDelete
);
adminNewsletterDraftRoutes.get("/:id", validateParams(idParamSchema), newsletterDraftController.getOne);
adminNewsletterDraftRoutes.put(
  "/:id",
  validateParams(idParamSchema),
  validateRequest(updateDraftSchema),
  newsletterDraftController.update
);
adminNewsletterDraftRoutes.delete(
  "/:id",
  validateParams(idParamSchema),
  newsletterDraftController.deleteOne
);

export default adminNewsletterDraftRoutes;
