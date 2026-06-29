import { Router, type IRouter } from "express";
import vehiclePricingPublicController from "../controllers/vehicle-pricing-public.controller";
import { validateQuery } from "@/middleware/validate";
import { getPublicPricingQuotesQuerySchema } from "../validators/vehicle-pricing.validator";
import { quoteRateLimiter } from "@/middleware/rateLimiters";

const publicVehiclePricingRoutes: IRouter = Router();

publicVehiclePricingRoutes.get(
  "/quote",
  quoteRateLimiter,
  validateQuery(getPublicPricingQuotesQuerySchema),
  vehiclePricingPublicController.getQuotes
);

export default publicVehiclePricingRoutes;
