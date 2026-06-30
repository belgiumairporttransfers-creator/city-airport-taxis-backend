import { Router, type IRouter } from "express";
import driverPublicController from "../controllers/driver-public.controller";
import { validateParams, validateRequest } from "@/middleware/validate";
import {
  applicationNumberParamSchema,
  driverUploadDocumentSchema,
  resubmitDriverSchema,
  submitDriverSchema,
} from "../validators/driver.validator";
import { driverApplyLimiter, driverDocumentUploadLimiter } from "@/middleware/rateLimiters";
import { uploadDriverDocument } from "../middleware/driver-document-upload";

const publicDriverRoutes: IRouter = Router();

publicDriverRoutes.post(
  "/apply",
  driverApplyLimiter,
  validateRequest(submitDriverSchema),
  driverPublicController.apply
);

publicDriverRoutes.get(
  "/application-status/:applicationNumber",
  driverApplyLimiter,
  validateParams(applicationNumberParamSchema),
  driverPublicController.getStatus
);

publicDriverRoutes.post(
  "/application/:applicationNumber/resubmit",
  driverApplyLimiter,
  validateParams(applicationNumberParamSchema),
  validateRequest(resubmitDriverSchema),
  driverPublicController.resubmit
);

publicDriverRoutes.post(
  "/upload-document",
  driverDocumentUploadLimiter,
  uploadDriverDocument("file"),
  validateRequest(driverUploadDocumentSchema),
  driverPublicController.uploadDocument
);

export default publicDriverRoutes;
