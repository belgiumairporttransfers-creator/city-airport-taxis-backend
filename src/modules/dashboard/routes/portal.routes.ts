import { Router, type IRouter } from "express";
import { protectUser } from "@/middleware/auth";
import dashboardPortalController from "../controllers/dashboard-portal.controller";

const portalDashboardRoutes: IRouter = Router();

portalDashboardRoutes.use(protectUser);
portalDashboardRoutes.get("/dashboard", dashboardPortalController.getOverview);

export default portalDashboardRoutes;
