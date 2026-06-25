import { Request, Response } from "express";
import vehicleCategoryService from "../services/vehicle-category.service";
import { toVehicleCategoryResponse } from "../dto";
import { asyncHandler } from "@/middleware/asyncHandler";
import { sendSuccess } from "@/shared/utils/response";
import { AppError } from "@/shared/errors/AppError";
import type { GetVehicleCategoriesQuery } from "../types/vehicle-category.types";

class VehicleCategoryController {
  getAll = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const result = await vehicleCategoryService.getCategories(
      req.query as GetVehicleCategoriesQuery
    );

    return sendSuccess(res, {
      items: result.items.map((item) => toVehicleCategoryResponse(item)),
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

    const category = await vehicleCategoryService.getCategory(req.params.id);

    return sendSuccess(res, toVehicleCategoryResponse(category));
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const category = await vehicleCategoryService.createCategory(
      req.body,
      req.admin._id.toString()
    );

    return sendSuccess(res, toVehicleCategoryResponse(category), {
      message: "Vehicle category created successfully",
    });
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const category = await vehicleCategoryService.updateCategory(
      req.params.id,
      req.body,
      req.admin._id.toString()
    );

    return sendSuccess(res, toVehicleCategoryResponse(category), {
      message: "Vehicle category updated successfully",
    });
  });

  deleteOne = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const deleted = await vehicleCategoryService.deleteCategory(
      req.params.id,
      req.admin._id.toString()
    );

    return sendSuccess(res, toVehicleCategoryResponse(deleted), {
      message: "Vehicle category deleted successfully",
    });
  });
}

export default new VehicleCategoryController();
