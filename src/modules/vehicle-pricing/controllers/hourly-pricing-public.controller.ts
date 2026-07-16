import { Request, Response } from "express";
import hourlyPricingService from "../services/hourly-pricing.service";
import { asyncHandler } from "@/middleware/asyncHandler";
import { sendSuccess } from "@/shared/utils/response";

class HourlyPricingPublicController {
  getDurations = asyncHandler(async (_req: Request, res: Response) => {
    const result = await hourlyPricingService.getPublicDurations();
    return sendSuccess(res, result);
  });
}

export default new HourlyPricingPublicController();
