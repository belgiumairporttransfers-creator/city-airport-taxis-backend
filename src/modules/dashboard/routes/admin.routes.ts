import { Router, type IRouter } from "express";
import dashboardAdminController from "../controllers/dashboard-admin.controller";

const adminDashboardRoutes: IRouter = Router();

adminDashboardRoutes.get("/", dashboardAdminController.getOverview);

export default adminDashboardRoutes;
