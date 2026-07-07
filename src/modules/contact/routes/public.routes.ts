import { Router, type IRouter } from "express";
import contactController from "../controllers/contact.controller";
import { validateRequest } from "@/middleware/validate";
import { submitContactSchema } from "../validators/contact.validator";
import { contactLimiter } from "@/middleware/rateLimiters";

const publicContactRoutes: IRouter = Router();

publicContactRoutes.post(
  "/",
  contactLimiter,
  validateRequest(submitContactSchema),
  contactController.submit
);

export default publicContactRoutes;
