import { Request, Response } from "express";
import hourlyPricingService from "../services/hourly-pricing.service";
import { toHourlyPricingResponse } from "../dto/hourly-pricing.dto";
import { asyncHandler } from "@/middleware/asyncHandler";
import { sendSuccess } from "@/shared/utils/response";
import { AppError } from "@/shared/errors/AppError";
import type {
  CreateHourlyPricingData,
  GetHourlyPricingQuery,
} from "../types/hourly-pricing.types";

class HourlyPricingController {
  listByCategory = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const items = await hourlyPricingService.getByCategory(req.params.categoryId);

    return sendSuccess(res, {
      items: items.map((item) => toHourlyPricingResponse(item)),
    });
  });

  createForCategory = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const payload: CreateHourlyPricingData = {
      ...req.body,
      categoryId: req.params.categoryId,
    };

    const pricing = await hourlyPricingService.create(payload, req.admin._id.toString());

    return sendSuccess(res, toHourlyPricingResponse(pricing), {
      message: "Hourly pricing created successfully",
    });
  });

  getAll = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const result = await hourlyPricingService.getAll(req.query as GetHourlyPricingQuery);

    return sendSuccess(res, {
      items: result.items.map((item) => toHourlyPricingResponse(item)),
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  });

  getOne = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const pricing = await hourlyPricingService.getOne(req.params.id);

    return sendSuccess(res, toHourlyPricingResponse(pricing));
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const pricing = await hourlyPricingService.update(
      req.params.id,
      req.body,
      req.admin._id.toString()
    );

    return sendSuccess(res, toHourlyPricingResponse(pricing), {
      message: "Hourly pricing updated successfully",
    });
  });

  deleteOne = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const deleted = await hourlyPricingService.deleteOne(
      req.params.id,
      req.admin._id.toString()
    );

    return sendSuccess(res, toHourlyPricingResponse(deleted), {
      message: "Hourly pricing deleted successfully",
    });
  });
}

export default new HourlyPricingController();
