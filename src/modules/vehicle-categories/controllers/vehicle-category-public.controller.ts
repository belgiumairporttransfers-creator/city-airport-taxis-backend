import { Request, Response } from "express";
import vehicleCategoryPublicService from "../services/vehicle-category-public.service";
import { asyncHandler } from "@/middleware/asyncHandler";
import { sendSuccess } from "@/shared/utils/response";

class VehicleCategoryPublicController {
  listActive = asyncHandler(async (_req: Request, res: Response) => {
    const categories = await vehicleCategoryPublicService.getActiveCategories();

    return sendSuccess(res, categories);
  });

  getBySlug = asyncHandler(async (req: Request, res: Response) => {
    const category = await vehicleCategoryPublicService.getCategoryBySlug(req.params.slug);

    return sendSuccess(res, category);
  });
}

export default new VehicleCategoryPublicController();
