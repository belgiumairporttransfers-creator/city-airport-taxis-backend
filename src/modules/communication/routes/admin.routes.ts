import { Router, type IRouter } from "express";
import communicationController from "../controllers/communication.controller";
import { validateQuery, validateParams, validateRequest } from "@/middleware/validate";
import {
  callIdParamSchema,
  conversationIdParamSchema,
  createConversationSchema,
  endCallSchema,
  getAttachmentsQuerySchema,
  getConversationsQuerySchema,
  getMessagesQuerySchema,
  initiateCallSchema,
  markMessageReadSchema,
  messageIdParamSchema,
  searchQuerySchema,
  sendMessageSchema,
  uploadAttachmentSchema,
} from "../validators/communication.validator";
import { communicationUploadSingle } from "../middleware/communication-upload";

const adminCommunicationRoutes: IRouter = Router();

adminCommunicationRoutes.get(
  "/conversations",
  validateQuery(getConversationsQuerySchema),
  communicationController.listConversations
);
adminCommunicationRoutes.post(
  "/conversations",
  validateRequest(createConversationSchema),
  communicationController.createConversation
);
adminCommunicationRoutes.get(
  "/conversations/:id",
  validateParams(conversationIdParamSchema),
  communicationController.getConversation
);
adminCommunicationRoutes.get(
  "/conversations/:id/messages",
  validateParams(conversationIdParamSchema),
  validateQuery(getMessagesQuerySchema),
  communicationController.listMessages
);
adminCommunicationRoutes.get(
  "/conversations/:id/attachments",
  validateParams(conversationIdParamSchema),
  validateQuery(getAttachmentsQuerySchema),
  communicationController.listAttachments
);
adminCommunicationRoutes.post(
  "/messages",
  validateRequest(sendMessageSchema),
  communicationController.sendMessage
);
adminCommunicationRoutes.patch(
  "/messages/:id/read",
  validateParams(messageIdParamSchema),
  validateRequest(markMessageReadSchema),
  communicationController.markMessageRead
);
adminCommunicationRoutes.delete(
  "/messages/:id",
  validateParams(messageIdParamSchema),
  communicationController.deleteMessage
);
adminCommunicationRoutes.get("/unread-count", communicationController.getUnreadCount);
adminCommunicationRoutes.get("/search", validateQuery(searchQuerySchema), communicationController.search);
adminCommunicationRoutes.post(
  "/attachments/upload",
  communicationUploadSingle,
  validateRequest(uploadAttachmentSchema),
  communicationController.uploadAttachment
);
adminCommunicationRoutes.post(
  "/calls",
  validateRequest(initiateCallSchema),
  communicationController.initiateCall
);
adminCommunicationRoutes.get("/calls", communicationController.listCalls);
adminCommunicationRoutes.get(
  "/calls/:id",
  validateParams(callIdParamSchema),
  communicationController.getCall
);
adminCommunicationRoutes.patch(
  "/calls/:id/accept",
  validateParams(callIdParamSchema),
  communicationController.acceptCall
);
adminCommunicationRoutes.patch(
  "/calls/:id/reject",
  validateParams(callIdParamSchema),
  validateRequest(endCallSchema),
  communicationController.rejectCall
);
adminCommunicationRoutes.patch(
  "/calls/:id/end",
  validateParams(callIdParamSchema),
  validateRequest(endCallSchema),
  communicationController.endCall
);

export default adminCommunicationRoutes;
