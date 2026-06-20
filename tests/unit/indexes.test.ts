import { describe, expect, it, vi } from "vitest";
import { ensureDatabaseIndexes } from "@/infrastructure/database/indexes/indexes";

const syncIndexes = vi.fn().mockResolvedValue(undefined);

vi.mock("@/infrastructure/database/models/User", () => ({
  User: { syncIndexes },
}));
vi.mock("@/infrastructure/database/models/Admin", () => ({
  Admin: { syncIndexes },
}));
vi.mock("@/infrastructure/database/models/Session", () => ({
  Session: { syncIndexes },
}));
vi.mock("@/infrastructure/database/models/Activity", () => ({
  Activity: { syncIndexes },
}));
vi.mock("@/infrastructure/database/models/Newsletter", () => ({
  Newsletter: { syncIndexes },
}));
vi.mock("@/infrastructure/database/models/Settings", () => ({
  Settings: { syncIndexes },
}));
vi.mock("@/infrastructure/database/models/AuditLog", () => ({
  AuditLog: { syncIndexes },
}));

describe("ensureDatabaseIndexes", () => {
  it("syncs indexes for all models", async () => {
    await ensureDatabaseIndexes();
    expect(syncIndexes).toHaveBeenCalledTimes(7);
  });
});
