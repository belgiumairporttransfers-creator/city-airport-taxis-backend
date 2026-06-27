import Joi from "joi";
import { idParamSchema, objectIdSchema } from "@/shared/validators/object-id.schema";
import {
  ATTACHMENT_KINDS,
  CALL_TYPES,
  MESSAGE_TYPES,
  PARTICIPANT_ACCOUNT_TYPES,
  PRESENCE_STATUSES,
} from "@/modules/communication/types/communication.types";

export const createConversationSchema = Joi.object({
  participantAccountType: Joi.string()
    .valid(...PARTICIPANT_ACCOUNT_TYPES)
    .required(),
  participantAccountId: objectIdSchema.required(),
});

export const getConversationsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
  search: Joi.string().trim().allow(""),
  isArchived: Joi.boolean(),
});

export const getMessagesQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(30),
  before: objectIdSchema,
  after: objectIdSchema,
});

export const sendMessageSchema = Joi.object({
  conversationId: objectIdSchema.required(),
  type: Joi.string()
    .valid(...MESSAGE_TYPES.filter((t) => t !== "system"))
    .required(),
  content: Joi.when("type", {
    is: "text",
    then: Joi.string().trim().min(1).max(10000).required(),
    otherwise: Joi.string().trim().max(10000).allow("", null),
  }),
  attachmentId: Joi.when("type", {
    is: Joi.valid("image", "document", "voice"),
    then: objectIdSchema.required(),
    otherwise: objectIdSchema.optional(),
  }),
  replyToMessageId: objectIdSchema,
  clientMessageId: Joi.string().uuid({ version: "uuidv4" }),
});

export const markMessageReadSchema = Joi.object({
  conversationId: objectIdSchema.required(),
});

export const searchQuerySchema = Joi.object({
  q: Joi.string().trim().min(2).max(200).required(),
  scope: Joi.string().valid("conversations", "messages", "all").default("all"),
  conversationId: objectIdSchema,
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
});

export const uploadAttachmentSchema = Joi.object({
  conversationId: objectIdSchema.required(),
  kind: Joi.string().valid(...ATTACHMENT_KINDS),
  duration: Joi.number().min(0).max(600),
  waveform: Joi.array().items(Joi.number().min(0).max(1)).max(100),
});

export const getAttachmentsQuerySchema = Joi.object({
  kind: Joi.string().valid(...ATTACHMENT_KINDS),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
});

export const initiateCallSchema = Joi.object({
  receiverAccountType: Joi.string()
    .valid(...PARTICIPANT_ACCOUNT_TYPES)
    .required(),
  receiverAccountId: objectIdSchema.required(),
  callType: Joi.string()
    .valid(...CALL_TYPES)
    .required(),
  conversationId: objectIdSchema,
});

export const endCallSchema = Joi.object({
  reason: Joi.string().trim().max(500).allow(""),
});

export const presenceSetSchema = Joi.object({
  status: Joi.string()
    .valid(...PRESENCE_STATUSES)
    .required(),
});

export const conversationJoinSchema = Joi.object({
  conversationId: objectIdSchema.required(),
});

export const conversationIdBodySchema = Joi.object({
  conversationId: objectIdSchema.required(),
});

export const callSignallingSchema = Joi.object({
  callId: objectIdSchema.required(),
  sdp: Joi.object().unknown(true),
  candidate: Joi.object().unknown(true),
  reason: Joi.string().trim().max(500).allow(""),
});

export { idParamSchema as conversationIdParamSchema };
export { idParamSchema as messageIdParamSchema };
export { idParamSchema as callIdParamSchema };
