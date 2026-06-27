import { CallSession } from "@/infrastructure/database/models/CallSession";
import type { CallStatus, CallType } from "@/modules/communication/types/communication.types";

const ACTIVE_CALL_STATUSES: CallStatus[] = ["initiated", "ringing", "accepted"];

class CallRepository {
  create(data: {
    conversationId?: string;
    callerAccountType: string;
    callerAccountId: string;
    receiverAccountType: string;
    receiverAccountId: string;
    callType: CallType;
    status?: CallStatus;
  }) {
    return CallSession.create({
      ...data,
      status: data.status ?? "initiated",
      startedAt: new Date(),
    });
  }

  findById(id: string) {
    return CallSession.findById(id);
  }

  findActiveByParticipant(accountType: string, accountId: string) {
    return CallSession.findOne({
      status: { $in: ACTIVE_CALL_STATUSES },
      $or: [
        { callerAccountType: accountType, callerAccountId: accountId },
        { receiverAccountType: accountType, receiverAccountId: accountId },
      ],
    });
  }

  updateStatus(
    id: string,
    status: CallStatus,
    fields?: Partial<{
      ringingAt: Date;
      answeredAt: Date;
      endedAt: Date;
      duration: number;
      endReason: string;
    }>
  ) {
    return CallSession.findByIdAndUpdate(id, { status, ...fields }, { new: true });
  }

  async findHistory(
    accountType: string,
    accountId: string,
    query: { page?: number; limit?: number }
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const filter = {
      $or: [
        { callerAccountType: accountType, callerAccountId: accountId },
        { receiverAccountType: accountType, receiverAccountId: accountId },
      ],
    };

    const [data, total] = await Promise.all([
      CallSession.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      CallSession.countDocuments(filter),
    ]);

    const pages = Math.ceil(total / limit) || 1;

    return { data, page, limit, total, pages, hasNextPage: page < pages, hasPrevPage: page > 1 };
  }
}

export default new CallRepository();
