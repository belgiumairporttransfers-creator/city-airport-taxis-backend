import { Request, Response } from "express";
import contactService from "../services/contact.service";
import type { GetContactsQuery } from "@/modules/contact/types/contact.types";
import { asyncHandler } from "@/middleware/asyncHandler";
import { sendSuccess } from "@/shared/utils/response";
import { AppError } from "@/shared/errors/AppError";

class ContactController {
  submit = asyncHandler(async (req: Request, res: Response) => {
    const contact = await contactService.submit(req.body);

    return sendSuccess(
      res,
      {
        id: contact._id,
      },
      {
        message: "Your message has been sent successfully",
        statusCode: 201,
      }
    );
  });

  getAll = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const result = await contactService.getContacts(req.query as unknown as GetContactsQuery);

    return sendSuccess(res, {
      items: result.items.map((item) => item.toObject()),
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  });

  deleteOne = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const deleted = await contactService.deleteContact(req.params.id);
    if (!deleted) {
      throw new AppError("Contact message not found", 404);
    }

    return sendSuccess(res, deleted.toObject(), {
      message: "Contact message removed successfully",
    });
  });

  bulkDelete = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) throw new AppError("Unauthorized", 401);

    const result = await contactService.bulkDeleteContacts(req.body);
    if (result.deletedCount === 0) {
      throw new AppError("No contact messages found to delete", 404);
    }

    return sendSuccess(res, result, {
      message:
        result.deletedCount === 1
          ? "Contact message removed successfully"
          : `${result.deletedCount} contact messages removed successfully`,
    });
  });
}

export default new ContactController();
