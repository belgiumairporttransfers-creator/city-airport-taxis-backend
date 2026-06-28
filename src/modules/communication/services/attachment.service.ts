import uploadService from "@/modules/upload/services/upload.service";
import { AppError } from "@/shared/errors/AppError";
import auditService from "@/shared/audit/audit.service";
import { AuditEvents } from "@/shared/audit/audit.events";
import messageAttachmentRepository from "@/modules/communication/repositories/message-attachment.repository";
import conversationService from "@/modules/communication/services/conversation.service";
import type {
  AttachmentKind,
  CommunicationActor,
} from "@/modules/communication/types/communication.types";

const VOICE_MIMES = new Set([
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
]);

class AttachmentService {
  detectKind(mimetype: string, explicit?: AttachmentKind): AttachmentKind {
    if (explicit) return explicit;

    const normalized = mimetype.split(";")[0].trim().toLowerCase();

    if (normalized.startsWith("image/")) return "image";
    if (VOICE_MIMES.has(normalized)) return "voice";
    return "document";
  }

  async upload(
    actor: CommunicationActor,
    conversationId: string,
    file: Express.Multer.File,
    metadata?: { kind?: AttachmentKind; duration?: number; waveform?: number[] }
  ) {
    await conversationService.assertParticipant(conversationId, actor);

    const kind = this.detectKind(file.mimetype, metadata?.kind);

    const folder = `communication/${conversationId}`;
    const uploadResult =
      kind === "image"
        ? await uploadService.uploadImage(file, folder)
        : kind === "voice"
          ? await uploadService.uploadVoice(file, folder)
          : await uploadService.uploadDocument(file, folder);

    const attachment = await messageAttachmentRepository.create({
      conversationId,
      uploadedByAccountType: actor.accountType,
      uploadedByAccountId: actor.accountId,
      kind,
      url: uploadResult.url,
      publicId: uploadResult.public_id,
      mimeType: file.mimetype,
      size: file.size,
      filename: file.originalname,
      duration: metadata?.duration,
      waveform: metadata?.waveform,
    });

    auditService.log({
      event: AuditEvents.ATTACHMENT_UPLOADED,
      actorId: actor.accountId,
      actorType: actor.accountType === "admin" ? "admin" : "user",
      entityType: "message-attachment",
      entityId: attachment._id.toString(),
      metadata: { conversationId, kind, size: file.size },
    });

    return attachment;
  }

  async getForMessage(attachmentId?: string) {
    if (!attachmentId) return null;
    return messageAttachmentRepository.findById(attachmentId);
  }

  async assertAttachmentForConversation(attachmentId: string, conversationId: string) {
    const attachment = await messageAttachmentRepository.findById(attachmentId);

    if (!attachment) {
      throw new AppError("Attachment not found", 404);
    }

    if (attachment.conversationId.toString() !== conversationId) {
      throw new AppError("Attachment does not belong to this conversation", 403);
    }

    if (attachment.messageId) {
      throw new AppError("Attachment is already linked to a message", 409);
    }

    return attachment;
  }

  async listByConversation(
    actor: CommunicationActor,
    conversationId: string,
    query: { kind?: AttachmentKind; page?: number; limit?: number }
  ) {
    await conversationService.assertParticipant(conversationId, actor);
    return messageAttachmentRepository.findByConversation(conversationId, query);
  }
}

export default new AttachmentService();
