import { Request, Response } from "express";
import customerService from "../services/customer.service";
import { toCustomerResponse } from "../dto";
import { asyncHandler } from "@/middleware/asyncHandler";
import { sendSuccess } from "@/shared/utils/response";
import { AppError } from "@/shared/errors/AppError";
import type { GetCustomersQuery } from "../types/customer.types";

class CustomerController {
  getAll = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const result = await customerService.getCustomers(req.query as GetCustomersQuery);

    return sendSuccess(res, {
      items: result.items.map((item) => toCustomerResponse(item)),
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  });

  getOne = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const customer = await customerService.getCustomer(req.params.id);

    return sendSuccess(res, toCustomerResponse(customer));
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const customer = await customerService.createCustomer(req.body, req.admin._id.toString());

    return sendSuccess(res, toCustomerResponse(customer), {
      message: "Customer created successfully",
    });
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const customer = await customerService.updateCustomer(
      req.params.id,
      req.body,
      req.admin._id.toString()
    );

    return sendSuccess(res, toCustomerResponse(customer), {
      message: "Customer updated successfully",
    });
  });

  archive = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const customer = await customerService.archiveCustomer(req.params.id, req.admin._id.toString());

    return sendSuccess(res, toCustomerResponse(customer), {
      message: "Customer archived successfully",
    });
  });

  restore = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const customer = await customerService.restoreCustomer(req.params.id, req.admin._id.toString());

    return sendSuccess(res, toCustomerResponse(customer), {
      message: "Customer restored successfully",
    });
  });
}

export default new CustomerController();
