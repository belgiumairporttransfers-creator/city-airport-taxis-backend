import { Request, Response } from "express";
import settingsService from "../services/settings.service";
import { asyncHandler } from "@/middleware/asyncHandler";
import { sendSuccess } from "@/shared/utils/response";
import { AppError } from "@/shared/errors/AppError";

class SettingsController {
  getPublicSettings = asyncHandler(async (_req: Request, res: Response) => {
    const settings = await settingsService.getPublicSettings();
    res.set("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
    return sendSuccess(res, settings);
  });

  getSettings = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const settings = await settingsService.getSettings();
    return sendSuccess(res, settings.toObject());
  });

  updateSettings = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);
    const settings = await settingsService.updateSettings(
      req.body,
      req.admin._id.toString()
    );
    return sendSuccess(res, settings.toObject(), {
      message: "Settings updated successfully",
    });
  });
}

export default new SettingsController();
