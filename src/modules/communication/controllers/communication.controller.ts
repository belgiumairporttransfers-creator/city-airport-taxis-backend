import { Request, Response } from "express";
import { asyncHandler } from "@/middleware/asyncHandler";
import { sendSuccess } from "@/shared/utils/response";
import { AppError } from "@/shared/errors/AppError";
import { resolveActorFromRequest } from "@/modules/communication/utils/actor";
import { toAttachmentResponse, toCallSessionResponse } from "@/modules/communication/dto";
import conversationService from "@/modules/communication/services/conversation.service";
import messageService from "@/modules/communication/services/message.service";
import attachmentService from "@/modules/communication/services/attachment.service";
import searchService from "@/modules/communication/services/search.service";
import callService from "@/modules/communication/services/call.service";
import { DRIVER_ROLE } from "@/modules/auth/types/auth.types";

class CommunicationController {
  private assertDriverIfPortal(req: Request) {
    if (req.user && req.user.role !== DRIVER_ROLE) {
      throw new AppError("This endpoint is for driver accounts only", 403);
    }
  }

  listConversations = asyncHandler(async (req: Request, res: Response) => {
    if (req.user) this.assertDriverIfPortal(req);
    const actor = resolveActorFromRequest(req);
    const result = await conversationService.list(actor, req.query as never);
    return sendSuccess(res, result);
  });

  createConversation = asyncHandler(async (req: Request, res: Response) => {
    if (req.user) this.assertDriverIfPortal(req);
    const actor = resolveActorFromRequest(req);
    const conversation = await conversationService.create(actor, req.body);
    const detail = await conversationService.getById(conversation._id.toString(), actor);
    return sendSuccess(res, detail, { message: "Conversation ready" });
  });

  getConversation = asyncHandler(async (req: Request, res: Response) => {
    if (req.user) this.assertDriverIfPortal(req);
    const actor = resolveActorFromRequest(req);
    const conversation = await conversationService.getById(req.params.id, actor);
    return sendSuccess(res, conversation);
  });

  listMessages = asyncHandler(async (req: Request, res: Response) => {
    if (req.user) this.assertDriverIfPortal(req);
    const actor = resolveActorFromRequest(req);
    const result = await messageService.list(req.params.id, actor, req.query as never);
    return sendSuccess(res, result);
  });

  sendMessage = asyncHandler(async (req: Request, res: Response) => {
    if (req.user) this.assertDriverIfPortal(req);
    const actor = resolveActorFromRequest(req);
    const message = await messageService.send(actor, req.body);
    return sendSuccess(res, message, { message: "Message sent" });
  });

  markMessageRead = asyncHandler(async (req: Request, res: Response) => {
    if (req.user) this.assertDriverIfPortal(req);
    const actor = resolveActorFromRequest(req);
    const result = await messageService.markRead(req.params.id, req.body.conversationId, actor);
    return sendSuccess(res, result);
  });

  deleteMessage = asyncHandler(async (req: Request, res: Response) => {
    if (req.user) this.assertDriverIfPortal(req);
    const actor = resolveActorFromRequest(req);
    const result = await messageService.softDelete(req.params.id, actor);
    return sendSuccess(res, result, { message: "Message deleted" });
  });

  getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
    if (req.user) this.assertDriverIfPortal(req);
    const actor = resolveActorFromRequest(req);
    const result = await conversationService.getUnreadCount(actor);
    return sendSuccess(res, result);
  });

  search = asyncHandler(async (req: Request, res: Response) => {
    if (req.user) this.assertDriverIfPortal(req);
    const actor = resolveActorFromRequest(req);
    const result = await searchService.search(actor, req.query as never);
    return sendSuccess(res, result);
  });

  uploadAttachment = asyncHandler(async (req: Request, res: Response) => {
    if (req.user) this.assertDriverIfPortal(req);
    const actor = resolveActorFromRequest(req);
    const file = req.file;

    if (!file) {
      throw new AppError("No file provided", 400);
    }

    const attachment = await attachmentService.upload(actor, req.body.conversationId, file, {
      kind: req.body.kind,
      duration: req.body.duration ? Number(req.body.duration) : undefined,
      waveform: req.body.waveform,
    });

    return sendSuccess(res, toAttachmentResponse(attachment), { message: "Attachment uploaded" });
  });

  listAttachments = asyncHandler(async (req: Request, res: Response) => {
    if (req.user) this.assertDriverIfPortal(req);
    const actor = resolveActorFromRequest(req);
    const result = await attachmentService.listByConversation(
      actor,
      req.params.id,
      req.query as never
    );
    return sendSuccess(res, {
      items: result.data.map((item) => toAttachmentResponse(item)),
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.pages,
      hasNextPage: result.hasNextPage,
      hasPrevPage: result.hasPrevPage,
    });
  });

  initiateCall = asyncHandler(async (req: Request, res: Response) => {
    if (req.user) this.assertDriverIfPortal(req);
    const actor = resolveActorFromRequest(req);
    const call = await callService.initiate(actor, req.body);
    return sendSuccess(res, call, { message: "Call initiated" });
  });

  listCalls = asyncHandler(async (req: Request, res: Response) => {
    if (req.user) this.assertDriverIfPortal(req);
    const actor = resolveActorFromRequest(req);
    const result = await callService.getHistory(actor, req.query as never);
    return sendSuccess(res, {
      items: result.data.map((item) => toCallSessionResponse(item)),
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.pages,
      hasNextPage: result.hasNextPage,
      hasPrevPage: result.hasPrevPage,
    });
  });

  getCall = asyncHandler(async (req: Request, res: Response) => {
    if (req.user) this.assertDriverIfPortal(req);
    const actor = resolveActorFromRequest(req);
    const call = await callService.getById(req.params.id, actor);
    return sendSuccess(res, call);
  });

  endCall = asyncHandler(async (req: Request, res: Response) => {
    if (req.user) this.assertDriverIfPortal(req);
    const actor = resolveActorFromRequest(req);
    const call = await callService.end(req.params.id, actor, req.body.reason);
    return sendSuccess(res, call);
  });

  acceptCall = asyncHandler(async (req: Request, res: Response) => {
    if (req.user) this.assertDriverIfPortal(req);
    const actor = resolveActorFromRequest(req);
    const call = await callService.accept(req.params.id, actor);
    return sendSuccess(res, call);
  });

  rejectCall = asyncHandler(async (req: Request, res: Response) => {
    if (req.user) this.assertDriverIfPortal(req);
    const actor = resolveActorFromRequest(req);
    const call = await callService.reject(req.params.id, actor, req.body.reason);
    return sendSuccess(res, call);
  });
}

export default new CommunicationController();
