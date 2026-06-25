import { Request, Response } from "express";
import vehicleService from "../services/vehicle.service";
import { toVehicleResponse } from "../dto";
import { asyncHandler } from "@/middleware/asyncHandler";
import { sendSuccess } from "@/shared/utils/response";
import { AppError } from "@/shared/errors/AppError";
import type { GetVehiclesQuery } from "../types/vehicle.types";

class VehicleController {
  getAll = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const result = await vehicleService.getVehicles(req.query as GetVehiclesQuery);

    return sendSuccess(res, {
      items: result.items.map((item) => toVehicleResponse(item)),
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

    const vehicle = await vehicleService.getVehicle(req.params.id);

    return sendSuccess(res, toVehicleResponse(vehicle));
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const vehicle = await vehicleService.createVehicle(req.body, req.admin._id.toString());

    return sendSuccess(res, toVehicleResponse(vehicle), {
      message: "Vehicle created successfully",
    });
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const vehicle = await vehicleService.updateVehicle(
      req.params.id,
      req.body,
      req.admin._id.toString()
    );

    return sendSuccess(res, toVehicleResponse(vehicle), {
      message: "Vehicle updated successfully",
    });
  });

  deleteOne = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const deleted = await vehicleService.deleteVehicle(req.params.id, req.admin._id.toString());

    return sendSuccess(res, toVehicleResponse(deleted), {
      message: "Vehicle deleted successfully",
    });
  });
}

export default new VehicleController();
