import { Router, type IRouter } from "express";
import adminRoutes from "./admin.routes";
import publicRoutes from "./public.routes";

const router: IRouter = Router();

router.use("/api", publicRoutes);
router.use("/api/admin", adminRoutes);

export default router;
