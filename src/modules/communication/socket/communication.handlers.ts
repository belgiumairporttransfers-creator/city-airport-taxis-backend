import type { AuthenticatedSocket } from "@/infrastructure/socket/types/socket.types";
import { DRIVER_ROLE } from "@/modules/auth/types/auth.types";
import { resolveSocketActor } from "@/modules/communication/utils/actor";
import conversationService from "@/modules/communication/services/conversation.service";
import messageService from "@/modules/communication/services/message.service";
import callService from "@/modules/communication/services/call.service";
import typingService from "@/modules/communication/services/typing.service";
import presenceService from "@/modules/communication/services/presence.service";
import communicationPubSub from "@/modules/communication/socket/communication-pubsub";
import { CommunicationSocketRooms } from "@/modules/communication/socket/communication.gateway";
import { Admin } from "@/infrastructure/database/models/Admin";
import { User } from "@/infrastructure/database/models/User";
import { AppError } from "@/shared/errors/AppError";
import logger from "@/shared/utils/logger";

const enrichActor = async (socket: AuthenticatedSocket) => {
  const actor = resolveSocketActor({
    userId: socket.data.userId,
    type: socket.data.type,
    role: socket.data.role,
  });

  if (socket.data.type === "admin") {
    const admin = await Admin.findById(socket.data.userId).lean();
    if (admin) {
      actor.displayName = `${admin.firstName} ${admin.lastName}`.trim();
      actor.avatarUrl = admin.avatar;
    }
  } else {
    const user = await User.findById(socket.data.userId).lean();
    if (user) {
      actor.displayName = `${user.firstName} ${user.lastName}`.trim();
      actor.avatarUrl = user.avatar;
      actor.role = user.role === DRIVER_ROLE ? "driver" : "customer";
    }
  }

  return actor;
};

export const registerCommunicationHandlers = (socket: AuthenticatedSocket): void => {
  void enrichActor(socket).then(async (actor) => {
    await presenceService.handleConnect(actor.accountType, actor.accountId);

    await communicationPubSub.publish({
      event: "user:online",
      payload: {
        accountType: actor.accountType,
        accountId: actor.accountId,
      },
      recipientAccountType: actor.accountType,
      recipientAccountIds: [actor.accountId],
    });
  });

  socket.on("conversation:join", async (payload: { conversationId?: string }, callback) => {
    try {
      if (!payload?.conversationId) {
        throw new AppError("conversationId is required", 400);
      }

      const actor = await enrichActor(socket);
      await conversationService.assertParticipant(payload.conversationId, actor);
      socket.join(CommunicationSocketRooms.conversation(payload.conversationId));
      callback?.({ success: true });
    } catch (error) {
      logger.warn("conversation:join failed", { error });
      callback?.({ success: false, error: error instanceof AppError ? error.message : "Failed" });
    }
  });

  socket.on("conversation:leave", (payload: { conversationId?: string }) => {
    if (payload?.conversationId) {
      socket.leave(CommunicationSocketRooms.conversation(payload.conversationId));
    }
  });

  socket.on("message:send", async (payload, callback) => {
    try {
      const actor = await enrichActor(socket);
      const message = await messageService.send(actor, payload, socket.id);
      callback?.({ success: true, data: message });
    } catch (error) {
      callback?.({ success: false, error: error instanceof AppError ? error.message : "Failed" });
    }
  });

  socket.on("message:delivered", async (payload: { messageId?: string }) => {
    if (!payload?.messageId) return;
    const actor = await enrichActor(socket);
    await messageService.markDelivered(payload.messageId, actor);
  });

  socket.on("message:typing", async (payload: { conversationId?: string }) => {
    if (!payload?.conversationId) return;
    const actor = await enrichActor(socket);
    await conversationService.assertParticipant(payload.conversationId, actor);
    await typingService.startTyping(payload.conversationId, actor.accountType, actor.accountId);

    await communicationPubSub.publish({
      event: "message:typing",
      conversationId: payload.conversationId,
      payload: {
        conversationId: payload.conversationId,
        accountType: actor.accountType,
        accountId: actor.accountId,
      },
      excludeSocketId: socket.id,
    });
  });

  socket.on("message:stop-typing", async (payload: { conversationId?: string }) => {
    if (!payload?.conversationId) return;
    const actor = await enrichActor(socket);
    await typingService.stopTyping(payload.conversationId, actor.accountType, actor.accountId);

    await communicationPubSub.publish({
      event: "message:stop-typing",
      conversationId: payload.conversationId,
      payload: {
        conversationId: payload.conversationId,
        accountType: actor.accountType,
        accountId: actor.accountId,
      },
      excludeSocketId: socket.id,
    });
  });

  socket.on("presence:set", async (payload: { status?: string }) => {
    if (!payload?.status) return;
    const actor = await enrichActor(socket);
    const result = await presenceService.setStatus(
      actor.accountType,
      actor.accountId,
      payload.status as "online" | "offline" | "away" | "busy"
    );

    await communicationPubSub.publish({
      event: "presence:update",
      payload: {
        accountType: actor.accountType,
        accountId: actor.accountId,
        status: result.status,
        lastSeenAt: result.lastSeenAt,
      },
      recipientAccountType: actor.accountType,
      recipientAccountIds: [actor.accountId],
    });
  });

  socket.on("call:start", async (payload, callback) => {
    try {
      const actor = await enrichActor(socket);
      const call = await callService.initiate(actor, payload);
      socket.join(CommunicationSocketRooms.call(call.id));
      callback?.({ success: true, data: call });
    } catch (error) {
      callback?.({ success: false, error: error instanceof AppError ? error.message : "Failed" });
    }
  });

  socket.on("call:accept", async (payload: { callId?: string }, callback) => {
    try {
      const actor = await enrichActor(socket);
      const call = await callService.accept(payload.callId!, actor);
      socket.join(CommunicationSocketRooms.call(call.id));
      callback?.({ success: true, data: call });
    } catch (error) {
      callback?.({ success: false, error: error instanceof AppError ? error.message : "Failed" });
    }
  });

  socket.on("call:reject", async (payload: { callId?: string; reason?: string }, callback) => {
    try {
      const actor = await enrichActor(socket);
      const call = await callService.reject(payload.callId!, actor, payload.reason);
      callback?.({ success: true, data: call });
    } catch (error) {
      callback?.({ success: false, error: error instanceof AppError ? error.message : "Failed" });
    }
  });

  socket.on("call:end", async (payload: { callId?: string; reason?: string }, callback) => {
    try {
      const actor = await enrichActor(socket);
      const call = await callService.end(payload.callId!, actor, payload.reason);
      callback?.({ success: true, data: call });
    } catch (error) {
      callback?.({ success: false, error: error instanceof AppError ? error.message : "Failed" });
    }
  });

  socket.on("call:offer", async (payload: { callId?: string; sdp?: unknown }) => {
    if (!payload?.callId || !payload.sdp) return;
    const actor = await enrichActor(socket);
    await callService.relayOffer(payload.callId, actor, payload.sdp);
  });

  socket.on("call:answer", async (payload: { callId?: string; sdp?: unknown }) => {
    if (!payload?.callId || !payload.sdp) return;
    const actor = await enrichActor(socket);
    await callService.relayAnswer(payload.callId, actor, payload.sdp);
  });

  socket.on("call:ice-candidate", async (payload: { callId?: string; candidate?: unknown }) => {
    if (!payload?.callId || !payload.candidate) return;
    const actor = await enrichActor(socket);
    await callService.relayIceCandidate(payload.callId, actor, payload.candidate);
  });

  socket.on("disconnect", () => {
    void enrichActor(socket).then(async (actor) => {
      const result = await presenceService.handleDisconnect(actor.accountType, actor.accountId);

      await communicationPubSub.publish({
        event: "user:offline",
        payload: {
          accountType: actor.accountType,
          accountId: actor.accountId,
          lastSeenAt: result.lastSeenAt,
        },
        recipientAccountType: actor.accountType,
        recipientAccountIds: [actor.accountId],
      });
    });
  });
};
