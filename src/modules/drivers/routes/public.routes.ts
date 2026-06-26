import { Router, type IRouter } from "express";
import driverPublicController from "../controllers/driver-public.controller";
import { validateParams, validateRequest } from "@/middleware/validate";
import {
  applicationNumberParamSchema,
  driverUploadDocumentSchema,
  resubmitDriverApplicationSchema,
  submitDriverApplicationSchema,
} from "../validators/driver.validator";
import { driverApplyLimiter, driverDocumentUploadLimiter } from "@/middleware/rateLimiters";
import { uploadDriverDocument } from "../middleware/driver-document-upload";

const publicDriverRoutes: IRouter = Router();

publicDriverRoutes.post(
  "/apply",
  driverApplyLimiter,
  validateRequest(submitDriverApplicationSchema),
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
  validateRequest(resubmitDriverApplicationSchema),
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
