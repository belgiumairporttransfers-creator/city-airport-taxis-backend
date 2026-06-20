import { Router, type IRouter } from "express";
import newsletterController from "../controllers/newsletter.controller";
import { validateRequest } from "@/middleware/validate";
import { subscribeSchema } from "../validators/newsletter.validator";
import { newsletterLimiter } from "@/middleware/rateLimiters";

const publicNewsletterRoutes: IRouter = Router();

publicNewsletterRoutes.post(
  "/",
  newsletterLimiter,
  validateRequest(subscribeSchema),
  newsletterController.subscribe
);

export default publicNewsletterRoutes;
