import { Request, Response } from "express";
import vehiclePricingService from "../services/vehicle-pricing.service";
import { asyncHandler } from "@/middleware/asyncHandler";
import { sendSuccess } from "@/shared/utils/response";

import type { GetPublicVehiclePricingQuotesQuery } from "../types/vehicle-pricing.types";

class VehiclePricingPublicController {
  getQuotes = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as GetPublicVehiclePricingQuotesQuery;
    const quotes = await vehiclePricingService.getPublicDistanceQuotes(query);
    return sendSuccess(res, quotes);
  });
}

export default new VehiclePricingPublicController();
