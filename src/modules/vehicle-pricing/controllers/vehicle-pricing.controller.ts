import { Request, Response } from "express";
import vehiclePricingService from "../services/vehicle-pricing.service";
import { toVehiclePricingResponse } from "../dto";
import { asyncHandler } from "@/middleware/asyncHandler";
import { sendSuccess } from "@/shared/utils/response";
import { AppError } from "@/shared/errors/AppError";
import type {
  CreateVehiclePricingData,
  GetVehiclePricingQuery,
} from "../types/vehicle-pricing.types";

class VehiclePricingController {
  listByCategory = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const slabs = await vehiclePricingService.getCategorySlabs(req.params.categoryId);

    return sendSuccess(res, {
      items: slabs.map((slab) => toVehiclePricingResponse(slab)),
    });
  });

  createForCategory = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const payload: CreateVehiclePricingData = {
      ...req.body,
      categoryId: req.params.categoryId,
    };

    const slab = await vehiclePricingService.createSlab(payload, req.admin._id.toString());

    return sendSuccess(res, toVehiclePricingResponse(slab), {
      message: "Vehicle pricing slab created successfully",
    });
  });

  validateStructure = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const result = await vehiclePricingService.validateCategoryCoverage(
      req.params.categoryId,
      req.admin._id.toString()
    );

    return sendSuccess(res, result, {
      message: "Vehicle pricing structure validated",
    });
  });

  getAll = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const result = await vehiclePricingService.getSlabs(req.query as GetVehiclePricingQuery);

    return sendSuccess(res, {
      items: result.items.map((item) => toVehiclePricingResponse(item)),
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

    const slab = await vehiclePricingService.getSlab(req.params.id);

    return sendSuccess(res, toVehiclePricingResponse(slab));
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const slab = await vehiclePricingService.updateSlab(
      req.params.id,
      req.body,
      req.admin._id.toString()
    );

    return sendSuccess(res, toVehiclePricingResponse(slab), {
      message: "Vehicle pricing slab updated successfully",
    });
  });

  deleteOne = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const deleted = await vehiclePricingService.deleteSlab(
      req.params.id,
      req.admin._id.toString()
    );

    return sendSuccess(res, toVehiclePricingResponse(deleted), {
      message: "Vehicle pricing slab deleted successfully",
    });
  });

  getQuotes = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const distance = Number(req.query.distance);
    const result = await vehiclePricingService.getDistanceQuotes(distance);

    return sendSuccess(res, result);
  });
}

export default new VehiclePricingController();
