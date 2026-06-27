import { describe, expect, it, vi } from "vitest";
import { ensureDatabaseIndexes } from "@/infrastructure/database/indexes/indexes";

const syncIndexes = vi.fn().mockResolvedValue(undefined);
const dropIndex = vi.fn().mockResolvedValue(undefined);

const mockModel = () => ({ syncIndexes });

const mockMessageModel = () => ({
  syncIndexes,
  collection: { dropIndex },
});

vi.mock("@/infrastructure/database/models/User", () => ({ User: mockModel() }));
vi.mock("@/infrastructure/database/models/Admin", () => ({ Admin: mockModel() }));
vi.mock("@/infrastructure/database/models/Session", () => ({ Session: mockModel() }));
vi.mock("@/infrastructure/database/models/Activity", () => ({ Activity: mockModel() }));
vi.mock("@/infrastructure/database/models/Newsletter", () => ({ Newsletter: mockModel() }));
vi.mock("@/infrastructure/database/models/NewsletterDraft", () => ({
  NewsletterDraft: mockModel(),
}));
vi.mock("@/infrastructure/database/models/NewsletterCampaign", () => ({
  NewsletterCampaign: mockModel(),
}));
vi.mock("@/infrastructure/database/models/NewsletterCampaignRecipient", () => ({
  NewsletterCampaignRecipient: mockModel(),
}));
vi.mock("@/infrastructure/database/models/Settings", () => ({ Settings: mockModel() }));
vi.mock("@/infrastructure/database/models/AuditLog", () => ({ AuditLog: mockModel() }));
vi.mock("@/infrastructure/database/models/Customer", () => ({ Customer: mockModel() }));
vi.mock("@/infrastructure/database/models/VehicleCategory", () => ({
  VehicleCategory: mockModel(),
}));
vi.mock("@/infrastructure/database/models/Vehicle", () => ({ Vehicle: mockModel() }));
vi.mock("@/infrastructure/database/models/VehiclePricing", () => ({
  VehiclePricing: mockModel(),
}));
vi.mock("@/infrastructure/database/models/DriverApplication", () => ({
  DriverApplication: mockModel(),
}));
vi.mock("@/infrastructure/database/models/Conversation", () => ({
  Conversation: mockModel(),
}));
vi.mock("@/infrastructure/database/models/Message", () => ({
  Message: mockMessageModel(),
}));
vi.mock("@/infrastructure/database/models/MessageAttachment", () => ({
  MessageAttachment: mockModel(),
}));
vi.mock("@/infrastructure/database/models/CallSession", () => ({
  CallSession: mockModel(),
}));
vi.mock("@/infrastructure/database/models/Notification", () => ({
  Notification: mockModel(),
}));

describe("ensureDatabaseIndexes", () => {
  it("syncs indexes for all models", async () => {
    syncIndexes.mockClear();
    dropIndex.mockClear();

    await ensureDatabaseIndexes();

    expect(dropIndex).toHaveBeenCalledWith("clientMessageId_1");
    expect(syncIndexes).toHaveBeenCalledTimes(20);
  });
});
