import { Request, Response } from "express";
import driverService from "../services/driver.service";
import { toDriverStatusResponse } from "../dto";
import { asyncHandler } from "@/middleware/asyncHandler";
import { sendSuccess } from "@/shared/utils/response";
import { AppError } from "@/shared/errors/AppError";

class DriverPublicController {
  apply = asyncHandler(async (req: Request, res: Response) => {
    const application = await driverService.submitApplication(req.body);

    return sendSuccess(
      res,
      {
        applicationNumber: application.applicationNumber,
        status: application.status,
      },
      {
        message: "Driver application submitted successfully",
        statusCode: 201,
      }
    );
  });

  resubmit = asyncHandler(async (req: Request, res: Response) => {
    const application = await driverService.resubmitApplication(
      req.params.applicationNumber,
      req.body
    );

    return sendSuccess(res, toDriverStatusResponse(application), {
      message: "Driver application resubmitted successfully",
    });
  });

  getStatus = asyncHandler(async (req: Request, res: Response) => {
    const application = await driverService.getApplicationStatus(req.params.applicationNumber);

    return sendSuccess(res, toDriverStatusResponse(application));
  });

  uploadDocument = asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw new AppError("No file provided", 400);
    }

    const result = await driverService.uploadDocument(
      {
        applicationNumber: req.body.applicationNumber,
        email: req.body.email,
      },
      req.file
    );

    return sendSuccess(res, result, {
      message: "Document uploaded successfully",
    });
  });
}

export default new DriverPublicController();
