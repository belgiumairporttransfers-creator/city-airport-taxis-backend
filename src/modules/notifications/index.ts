import notificationPubSubManager from "./socket/notification-pubsub";

export { default as notificationController } from "./controllers/notification.controller";
export { default as notificationService } from "./services/notification.service";
export { default as notificationRepository } from "./repositories/notification.repository";
export { default as adminNotificationRoutes } from "./routes/admin.routes";
export { default as notificationGateway } from "./socket/notification.gateway";
export { default as notificationPubSub } from "./socket/notification-pubsub";
export { toNotificationResponse } from "./dto";

export const initNotificationInfrastructure = async (): Promise<void> => {
  await notificationPubSubManager.init();
};

export const shutdownNotificationInfrastructure = async (): Promise<void> => {
  await notificationPubSubManager.shutdown();
};
