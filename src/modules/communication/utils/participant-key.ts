import type { ParticipantAccountType } from "@/modules/communication/types/communication.types";

export const buildParticipantKey = (
  a: { accountType: ParticipantAccountType; accountId: string },
  b: { accountType: ParticipantAccountType; accountId: string }
): string => {
  const parts = [`${a.accountType}:${a.accountId}`, `${b.accountType}:${b.accountId}`].sort();
  return parts.join("|");
};

export const participantRoomKey = (
  accountType: ParticipantAccountType,
  accountId: string
): string => `${accountType}:${accountId}`;
