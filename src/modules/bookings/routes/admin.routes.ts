import { Router, type IRouter } from "express";
import bookingController from "../controllers/booking.controller";
import { validateParams, validateQuery, validateRequest } from "@/middleware/validate";
import { idParamSchema } from "@/shared/validators/object-id.schema";
import {
  bulkCompleteBookingsSchema,
  bulkDeleteBookingsSchema,
  cancelBookingSchema,
  getBookingsQuerySchema,
  updateBookingSchema,
} from "../validators/booking.validator";

const adminBookingRoutes: IRouter = Router();

adminBookingRoutes.get("/", validateQuery(getBookingsQuerySchema), bookingController.getAll);

adminBookingRoutes.delete(
  "/bulk",
  validateRequest(bulkDeleteBookingsSchema),
  bookingController.bulkDelete
);

adminBookingRoutes.post(
  "/bulk-complete",
  validateRequest(bulkCompleteBookingsSchema),
  bookingController.bulkComplete
);

adminBookingRoutes.get(
  "/:id",
  validateParams(idParamSchema),
  bookingController.getOne
);

adminBookingRoutes.patch(
  "/:id",
  validateParams(idParamSchema),
  validateRequest(updateBookingSchema),
  bookingController.update
);

adminBookingRoutes.post(
  "/:id/confirm",
  validateParams(idParamSchema),
  bookingController.confirm
);

adminBookingRoutes.post(
  "/:id/cancel",
  validateParams(idParamSchema),
  validateRequest(cancelBookingSchema),
  bookingController.cancel
);

adminBookingRoutes.post(
  "/:id/no-show",
  validateParams(idParamSchema),
  bookingController.markNoShow
);

adminBookingRoutes.post(
  "/:id/complete",
  validateParams(idParamSchema),
  bookingController.complete
);

adminBookingRoutes.delete("/:id", validateParams(idParamSchema), bookingController.deleteOne);

export default adminBookingRoutes;
