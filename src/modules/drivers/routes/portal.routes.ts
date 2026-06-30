import { Router, type IRouter } from "express";
import driverPortalController from "../controllers/driver-portal.controller";
import { protectUser } from "@/middleware/auth";
import { validateRequest } from "@/middleware/validate";
import { updateDriverSchema } from "../validators/driver.validator";

const portalDriverRoutes: IRouter = Router();

portalDriverRoutes.use(protectUser);
portalDriverRoutes.get("/me", driverPortalController.getMyApplication);
portalDriverRoutes.patch(
  "/me",
  validateRequest(updateDriverSchema),
  driverPortalController.updateMyApplication
);

export default portalDriverRoutes;
