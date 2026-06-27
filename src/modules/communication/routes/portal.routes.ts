import { Router, type IRouter } from "express";
import { protectUser } from "@/middleware/auth";
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

const portalCommunicationRoutes: IRouter = Router();

portalCommunicationRoutes.use(protectUser);

portalCommunicationRoutes.get(
  "/conversations",
  validateQuery(getConversationsQuerySchema),
  communicationController.listConversations
);
portalCommunicationRoutes.post(
  "/conversations",
  validateRequest(createConversationSchema),
  communicationController.createConversation
);
portalCommunicationRoutes.get(
  "/conversations/:id",
  validateParams(conversationIdParamSchema),
  communicationController.getConversation
);
portalCommunicationRoutes.get(
  "/conversations/:id/messages",
  validateParams(conversationIdParamSchema),
  validateQuery(getMessagesQuerySchema),
  communicationController.listMessages
);
portalCommunicationRoutes.get(
  "/conversations/:id/attachments",
  validateParams(conversationIdParamSchema),
  validateQuery(getAttachmentsQuerySchema),
  communicationController.listAttachments
);
portalCommunicationRoutes.post(
  "/messages",
  validateRequest(sendMessageSchema),
  communicationController.sendMessage
);
portalCommunicationRoutes.patch(
  "/messages/:id/read",
  validateParams(messageIdParamSchema),
  validateRequest(markMessageReadSchema),
  communicationController.markMessageRead
);
portalCommunicationRoutes.delete(
  "/messages/:id",
  validateParams(messageIdParamSchema),
  communicationController.deleteMessage
);
portalCommunicationRoutes.get("/unread-count", communicationController.getUnreadCount);
portalCommunicationRoutes.get(
  "/search",
  validateQuery(searchQuerySchema),
  communicationController.search
);
portalCommunicationRoutes.post(
  "/attachments/upload",
  communicationUploadSingle,
  validateRequest(uploadAttachmentSchema),
  communicationController.uploadAttachment
);
portalCommunicationRoutes.post(
  "/calls",
  validateRequest(initiateCallSchema),
  communicationController.initiateCall
);
portalCommunicationRoutes.get("/calls", communicationController.listCalls);
portalCommunicationRoutes.get(
  "/calls/:id",
  validateParams(callIdParamSchema),
  communicationController.getCall
);
portalCommunicationRoutes.patch(
  "/calls/:id/accept",
  validateParams(callIdParamSchema),
  communicationController.acceptCall
);
portalCommunicationRoutes.patch(
  "/calls/:id/reject",
  validateParams(callIdParamSchema),
  validateRequest(endCallSchema),
  communicationController.rejectCall
);
portalCommunicationRoutes.patch(
  "/calls/:id/end",
  validateParams(callIdParamSchema),
  validateRequest(endCallSchema),
  communicationController.endCall
);

export default portalCommunicationRoutes;
