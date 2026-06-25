import { Router, type IRouter } from "express";
import vehiclePricingPublicController from "../controllers/vehicle-pricing-public.controller";
import { validateQuery } from "@/middleware/validate";
import { getPricingQuotesQuerySchema } from "../validators/vehicle-pricing.validator";
import { quoteRateLimiter } from "@/middleware/rateLimiters";

const publicVehiclePricingRoutes: IRouter = Router();

publicVehiclePricingRoutes.get(
  "/quotes",
  quoteRateLimiter,
  validateQuery(getPricingQuotesQuerySchema),
  vehiclePricingPublicController.getQuotes
);

export default publicVehiclePricingRoutes;
