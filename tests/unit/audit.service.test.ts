import { describe, expect, it, vi } from "vitest";
import auditService from "@/shared/audit/audit.service";
import { AuditLog } from "@/infrastructure/database/models/AuditLog";
import { AuditEvents } from "@/shared/audit/audit.events";

vi.mock("@/infrastructure/database/models/AuditLog", () => ({
  AuditLog: {
    create: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("auditService", () => {
  it("persists audit events to MongoDB", async () => {
    auditService.log({
      event: AuditEvents.LOGIN_SUCCESS,
      actorId: "user-1",
      actorType: "user",
      status: "success",
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(AuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        event: AuditEvents.LOGIN_SUCCESS,
        actorId: "user-1",
      })
    );
  });
});
