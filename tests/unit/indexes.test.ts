import { describe, expect, it, vi } from "vitest";
import { ensureDatabaseIndexes } from "@/infrastructure/database/indexes/indexes";

const syncIndexes = vi.fn().mockResolvedValue(undefined);
const dropIndex = vi.fn().mockResolvedValue(undefined);

const mockModel = () => ({ syncIndexes, collection: { dropIndex } });

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
vi.mock("@/infrastructure/database/models/Driver", () => ({
  Driver: mockModel(),
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
vi.mock("@/infrastructure/database/models/Booking", () => ({ Booking: mockModel() }));
vi.mock("@/infrastructure/database/models/Payment", () => ({ Payment: mockModel() }));
vi.mock("@/infrastructure/database/models/Assignment", () => ({ Assignment: mockModel() }));

describe("ensureDatabaseIndexes", () => {
  it("syncs indexes for all models and drops legacy booking indexes", async () => {
    syncIndexes.mockClear();
    dropIndex.mockClear();

    await ensureDatabaseIndexes();

    expect(dropIndex).toHaveBeenCalledWith("clientMessageId_1");
    expect(dropIndex).toHaveBeenCalledWith("orderNumber_1");
    expect(dropIndex).toHaveBeenCalledWith("driver_application_active_email_unique");
    expect(syncIndexes).toHaveBeenCalledTimes(23);
  });
});
