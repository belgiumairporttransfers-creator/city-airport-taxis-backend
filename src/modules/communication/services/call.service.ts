import { RedisClient } from "@/infrastructure/redis/client";
import notificationService from "@/modules/notifications/services/notification.service";
import { onlineUsersRegistry } from "@/infrastructure/socket/registry/online-users.registry";
import { AppError } from "@/shared/errors/AppError";
import auditService from "@/shared/audit/audit.service";
import { AuditEvents } from "@/shared/audit/audit.events";
import logger from "@/shared/utils/logger";
import { toCallSessionResponse } from "@/modules/communication/dto";
import callRepository from "@/modules/communication/repositories/call.repository";
import conversationService from "@/modules/communication/services/conversation.service";
import participantService from "@/modules/communication/services/participant.service";
import communicationPubSub from "@/modules/communication/socket/communication-pubsub";
import type {
  CommunicationActor,
  InitiateCallData,
} from "@/modules/communication/types/communication.types";

const CALL_SIGNAL_TTL = 120;
const RING_TIMEOUT_MS = 45_000;

const signalKey = (callId: string, suffix: string) => `comm:call:${callId}:${suffix}`;

const ringTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

class CallService {
  async initiate(actor: CommunicationActor, data: InitiateCallData) {
    const receiver = await participantService.resolveParticipant(
      data.receiverAccountType,
      data.receiverAccountId
    );

    participantService.validateConversationCreation(actor, receiver);

    if (receiver.role === "driver") {
      await participantService.assertDriverEligible(receiver.accountId);
    }

    const busy = await callRepository.findActiveByParticipant(
      data.receiverAccountType,
      data.receiverAccountId
    );

    if (busy) {
      throw new AppError("Recipient is busy on another call", 409);
    }

    const callerBusy = await callRepository.findActiveByParticipant(actor.accountType, actor.accountId);
    if (callerBusy) {
      throw new AppError("You are already on a call", 409);
    }

    if (data.conversationId) {
      await conversationService.assertParticipant(data.conversationId, actor);
    }

    const call = await callRepository.create({
      conversationId: data.conversationId,
      callerAccountType: actor.accountType,
      callerAccountId: actor.accountId,
      receiverAccountType: receiver.accountType,
      receiverAccountId: receiver.accountId,
      callType: data.callType,
      status: "ringing",
    });

    await callRepository.updateStatus(call._id.toString(), "ringing", { ringingAt: new Date() });

    const dto = toCallSessionResponse(call);

    auditService.log({
      event: AuditEvents.CALL_STARTED,
      actorId: actor.accountId,
      actorType: actor.accountType === "admin" ? "admin" : "user",
      entityType: "call-session",
      entityId: call._id.toString(),
      metadata: { callType: data.callType, receiverAccountId: receiver.accountId },
    });

    await communicationPubSub.publish({
      event: "call:ringing",
      callId: call._id.toString(),
      recipientAccountType: receiver.accountType,
      recipientAccountIds: [receiver.accountId],
      payload: dto,
    });

    this.scheduleMissedCall(call._id.toString());

    const isOnline = await onlineUsersRegistry.isUserOnline(receiver.accountId);
    if (!isOnline) {
      try {
        const notify =
          receiver.accountType === "admin"
            ? () =>
                notificationService.notifyAdmins({
                  title: `Incoming ${data.callType} call`,
                  message: `${actor.displayName} is calling you`,
                  type: "communication.call.incoming",
                  severity: "info",
                  entityType: "communication",
                  entityId: call._id.toString(),
                  actionUrl: `/chat?callId=${call._id.toString()}`,
                })
            : () =>
                notificationService.notifyUser(receiver.accountId, {
                  title: `Incoming ${data.callType} call`,
                  message: `${actor.displayName} is calling you`,
                  type: "communication.call.incoming",
                  severity: "info",
                  entityType: "communication",
                  entityId: call._id.toString(),
                  actionUrl: `/chat?callId=${call._id.toString()}`,
                });

        await notify();
      } catch (error) {
        logger.error("Failed to send call notification", { error });
      }
    }

    return dto;
  }

  private scheduleMissedCall(callId: string) {
    const existing = ringTimeouts.get(callId);
    if (existing) clearTimeout(existing);

    ringTimeouts.set(
      callId,
      setTimeout(() => {
        void this.handleMissed(callId);
      }, RING_TIMEOUT_MS)
    );
  }

  private clearRingTimeout(callId: string) {
    const timeout = ringTimeouts.get(callId);
    if (timeout) {
      clearTimeout(timeout);
      ringTimeouts.delete(callId);
    }
  }

  async assertCallParticipant(callId: string, actor: CommunicationActor) {
    const call = await callRepository.findById(callId);
    if (!call) {
      throw new AppError("Call not found", 404);
    }

    const isParticipant =
      (call.callerAccountType === actor.accountType && call.callerAccountId === actor.accountId) ||
      (call.receiverAccountType === actor.accountType &&
        call.receiverAccountId === actor.accountId);

    if (!isParticipant) {
      throw new AppError("You are not a participant in this call", 403);
    }

    return call;
  }

  async accept(callId: string, actor: CommunicationActor) {
    const call = await this.assertCallParticipant(callId, actor);

    if (call.receiverAccountId !== actor.accountId || call.receiverAccountType !== actor.accountType) {
      throw new AppError("Only the receiver can accept this call", 403);
    }

    if (call.status !== "ringing") {
      throw new AppError("Call is not ringing", 409);
    }

    this.clearRingTimeout(callId);

    const updated = await callRepository.updateStatus(callId, "accepted", { answeredAt: new Date() });
    const dto = toCallSessionResponse(updated!);

    await communicationPubSub.publish({
      event: "call:accept",
      callId,
      payload: dto,
    });

    return dto;
  }

  async reject(callId: string, actor: CommunicationActor, reason?: string) {
    const call = await this.assertCallParticipant(callId, actor);
    this.clearRingTimeout(callId);

    const status = call.status === "ringing" ? "rejected" : "ended";
    const updated = await callRepository.updateStatus(callId, status, {
      endedAt: new Date(),
      endReason: reason ?? "rejected",
    });

    const dto = toCallSessionResponse(updated!);

    await communicationPubSub.publish({
      event: "call:reject",
      callId,
      payload: dto,
    });

    return dto;
  }

  async end(callId: string, actor: CommunicationActor, reason?: string) {
    const call = await this.assertCallParticipant(callId, actor);
    this.clearRingTimeout(callId);

    const endedAt = new Date();
    const duration =
      call.answeredAt != null
        ? Math.max(0, Math.floor((endedAt.getTime() - call.answeredAt.getTime()) / 1000))
        : undefined;

    const updated = await callRepository.updateStatus(callId, "ended", {
      endedAt,
      duration,
      endReason: reason ?? "ended",
    });

    const dto = toCallSessionResponse(updated!);

    auditService.log({
      event: AuditEvents.CALL_ENDED,
      actorId: actor.accountId,
      actorType: actor.accountType === "admin" ? "admin" : "user",
      entityType: "call-session",
      entityId: callId,
      metadata: { duration, reason },
    });

    await communicationPubSub.publish({
      event: "call:end",
      callId,
      payload: dto,
    });

    await this.clearSignalling(callId);
    return dto;
  }

  async handleMissed(callId: string) {
    const call = await callRepository.findById(callId);
    if (!call || call.status !== "ringing") return;

    const updated = await callRepository.updateStatus(callId, "missed", {
      endedAt: new Date(),
      endReason: "timeout",
    });

    auditService.log({
      event: AuditEvents.CALL_MISSED,
      actorType: "system",
      entityType: "call-session",
      entityId: callId,
    });

    await communicationPubSub.publish({
      event: "call:end",
      callId,
      payload: toCallSessionResponse(updated!),
    });

    try {
      await notificationService.notifyUser(call.callerAccountId, {
        title: "Missed call",
        message: "Your call was not answered",
        type: "communication.call.missed",
        severity: "warning",
        entityType: "communication",
        entityId: callId,
      });
    } catch (error) {
      logger.error("Failed to send missed call notification", { error });
    }
  }

  async relayOffer(callId: string, actor: CommunicationActor, sdp: unknown) {
    const call = await this.assertCallParticipant(callId, actor);
    await this.storeSignal(callId, "offer", sdp);

    const targetId =
      call.callerAccountId === actor.accountId ? call.receiverAccountId : call.callerAccountId;
    const targetType =
      call.callerAccountId === actor.accountId ? call.receiverAccountType : call.callerAccountType;

    await communicationPubSub.publish({
      event: "call:offer",
      callId,
      recipientAccountType: targetType,
      recipientAccountIds: [targetId],
      payload: { callId, sdp },
    });
  }

  async relayAnswer(callId: string, actor: CommunicationActor, sdp: unknown) {
    const call = await this.assertCallParticipant(callId, actor);
    await this.storeSignal(callId, "answer", sdp);

    const targetId =
      call.callerAccountId === actor.accountId ? call.receiverAccountId : call.callerAccountId;
    const targetType =
      call.callerAccountId === actor.accountId ? call.receiverAccountType : call.callerAccountType;

    await communicationPubSub.publish({
      event: "call:answer",
      callId,
      recipientAccountType: targetType,
      recipientAccountIds: [targetId],
      payload: { callId, sdp },
    });
  }

  async relayIceCandidate(callId: string, actor: CommunicationActor, candidate: unknown) {
    const call = await this.assertCallParticipant(callId, actor);
    await this.appendIceCandidate(callId, actor.accountId, candidate);

    const targetId =
      call.callerAccountId === actor.accountId ? call.receiverAccountId : call.callerAccountId;
    const targetType =
      call.callerAccountId === actor.accountId ? call.receiverAccountType : call.callerAccountType;

    await communicationPubSub.publish({
      event: "call:ice-candidate",
      callId,
      recipientAccountType: targetType,
      recipientAccountIds: [targetId],
      payload: { callId, candidate },
    });
  }

  private async storeSignal(callId: string, suffix: string, data: unknown) {
    const client = await RedisClient.connect();
    if (client) {
      await client.set(signalKey(callId, suffix), JSON.stringify(data), { EX: CALL_SIGNAL_TTL });
    }
  }

  private async appendIceCandidate(callId: string, side: string, candidate: unknown) {
    const client = await RedisClient.connect();
    if (client) {
      await client.rPush(signalKey(callId, `ice:${side}`), JSON.stringify(candidate));
      await client.expire(signalKey(callId, `ice:${side}`), CALL_SIGNAL_TTL);
    }
  }

  private async clearSignalling(callId: string) {
    const client = await RedisClient.connect();
    if (!client) return;
    const keys = await client.keys(`comm:call:${callId}:*`);
    if (keys.length) {
      await client.del(keys);
    }
  }

  async getHistory(actor: CommunicationActor, query: { page?: number; limit?: number }) {
    return callRepository.findHistory(actor.accountType, actor.accountId, query);
  }

  async getById(callId: string, actor: CommunicationActor) {
    const call = await this.assertCallParticipant(callId, actor);
    return toCallSessionResponse(call);
  }
}

export default new CallService();
