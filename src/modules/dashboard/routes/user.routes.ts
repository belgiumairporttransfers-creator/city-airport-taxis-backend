import { Router, type IRouter } from "express";
import { protectUser } from "@/middleware/auth";
import dashboardUserController from "../controllers/dashboard-user.controller";

const userDashboardRoutes: IRouter = Router();

userDashboardRoutes.use(protectUser);

userDashboardRoutes.get("/overview", dashboardUserController.getOverview);
userDashboardRoutes.get("/bookings", dashboardUserController.getBookings);
userDashboardRoutes.delete("/bookings/bulk", dashboardUserController.bulkDeleteBookings);
userDashboardRoutes.post("/bookings/bulk-delete", dashboardUserController.bulkDeleteBookings);
userDashboardRoutes.get("/bookings/:id/receipt", dashboardUserController.downloadReceipt);
userDashboardRoutes.delete("/bookings/:id", dashboardUserController.deleteBooking);
userDashboardRoutes.post("/bookings/:id/cancel", dashboardUserController.cancelBooking);
userDashboardRoutes.get("/payments", dashboardUserController.getPayments);

export default userDashboardRoutes;
