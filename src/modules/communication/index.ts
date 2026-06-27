import communicationPubSub from "./socket/communication-pubsub";

export { default as communicationController } from "./controllers/communication.controller";
export { default as conversationService } from "./services/conversation.service";
export { default as messageService } from "./services/message.service";
export { default as callService } from "./services/call.service";
export { default as adminCommunicationRoutes } from "./routes/admin.routes";
export { default as portalCommunicationRoutes } from "./routes/portal.routes";
export {
  toConversationListItem,
  toMessageResponse,
  toAttachmentResponse,
  toCallSessionResponse,
} from "./dto";

export const initCommunicationInfrastructure = async (): Promise<void> => {
  await communicationPubSub.init();
};

export const shutdownCommunicationInfrastructure = async (): Promise<void> => {
  await communicationPubSub.shutdown();
};

export { registerCommunicationHandlers } from "./socket/communication.handlers";
