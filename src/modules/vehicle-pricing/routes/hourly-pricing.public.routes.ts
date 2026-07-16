import { Router, type IRouter } from "express";
import hourlyPricingPublicController from "../controllers/hourly-pricing-public.controller";

const publicHourlyPricingRoutes: IRouter = Router();

publicHourlyPricingRoutes.get("/durations", hourlyPricingPublicController.getDurations);

export default publicHourlyPricingRoutes;
