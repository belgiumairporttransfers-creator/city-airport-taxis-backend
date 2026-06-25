import { Request, Response } from "express";
import vehiclePricingService from "../services/vehicle-pricing.service";
import { asyncHandler } from "@/middleware/asyncHandler";
import { sendSuccess } from "@/shared/utils/response";

class VehiclePricingPublicController {
  getQuotes = asyncHandler(async (req: Request, res: Response) => {
    const distance = Number(req.query.distance);
    const quotes = await vehiclePricingService.getPublicDistanceQuotes(distance);

    return sendSuccess(res, quotes);
  });
}

export default new VehiclePricingPublicController();
