export const ensureDatabaseIndexes = async (): Promise<void> => {
  const { User } = await import("@/infrastructure/database/models/User");
  const { Admin } = await import("@/infrastructure/database/models/Admin");
  const { Session } = await import("@/infrastructure/database/models/Session");
  const { Activity } = await import("@/infrastructure/database/models/Activity");
  const { Newsletter } = await import("@/infrastructure/database/models/Newsletter");
  const { Contact } = await import("@/infrastructure/database/models/Contact");
  const { NewsletterDraft } = await import("@/infrastructure/database/models/NewsletterDraft");
  const { NewsletterCampaign } =
    await import("@/infrastructure/database/models/NewsletterCampaign");
  const { NewsletterCampaignRecipient } =
    await import("@/infrastructure/database/models/NewsletterCampaignRecipient");
  const { Settings } = await import("@/infrastructure/database/models/Settings");
  const { AuditLog } = await import("@/infrastructure/database/models/AuditLog");
  const { Customer } = await import("@/infrastructure/database/models/Customer");
  const { VehicleCategory } = await import("@/infrastructure/database/models/VehicleCategory");
  const { Vehicle } = await import("@/infrastructure/database/models/Vehicle");
  const { VehiclePricing } = await import("@/infrastructure/database/models/VehiclePricing");
  const { HourlyPricing } = await import("@/infrastructure/database/models/HourlyPricing");
  const { Driver } = await import("@/infrastructure/database/models/Driver");
  const { Conversation } = await import("@/infrastructure/database/models/Conversation");
  const { Message } = await import("@/infrastructure/database/models/Message");
  const { MessageAttachment } = await import("@/infrastructure/database/models/MessageAttachment");
  const { CallSession } = await import("@/infrastructure/database/models/CallSession");
  const { Notification } = await import("@/infrastructure/database/models/Notification");
  const { Booking } = await import("@/infrastructure/database/models/Booking");
  const { Payment } = await import("@/infrastructure/database/models/Payment");
  const { Assignment } = await import("@/infrastructure/database/models/Assignment");

  const dropLegacyIndex = async (model: { collection: { dropIndex: (name: string) => Promise<unknown> } }, name: string) => {
    try {
      await model.collection.dropIndex(name);
    } catch {
      // Legacy index may already be removed.
    }
  };

  const syncMessageIndexes = async (): Promise<void> => {
    await dropLegacyIndex(Message, "clientMessageId_1");
    await Message.syncIndexes();
  };

  const syncBookingIndexes = async (): Promise<void> => {
    const legacyBookingIndexes = [
      "orderNumber_1",
      "driverId_1",
      "fleetId_1",
      "bookingStatus_1",
      "bookingDetails.date_1",
      "passengerInfo.email_1",
    ];

    for (const indexName of legacyBookingIndexes) {
      await dropLegacyIndex(Booking, indexName);
    }

    await Booking.syncIndexes();
  };

  const syncDriverIndexes = async (): Promise<void> => {
    const legacyDriverIndexes = [
      "driver_application_active_email_unique",
      "driver_application_text_search",
    ];

    for (const indexName of legacyDriverIndexes) {
      await dropLegacyIndex(Driver, indexName);
    }

    await Driver.syncIndexes();
  };

  await Promise.all([
    User.syncIndexes(),
    Admin.syncIndexes(),
    Session.syncIndexes(),
    Activity.syncIndexes(),
    Newsletter.syncIndexes(),
    Contact.syncIndexes(),
    NewsletterDraft.syncIndexes(),
    NewsletterCampaign.syncIndexes(),
    NewsletterCampaignRecipient.syncIndexes(),
    Settings.syncIndexes(),
    AuditLog.syncIndexes(),
    Customer.syncIndexes(),
    VehicleCategory.syncIndexes(),
    Vehicle.syncIndexes(),
    VehiclePricing.syncIndexes(),
    HourlyPricing.syncIndexes(),
    syncDriverIndexes(),
    Conversation.syncIndexes(),
    syncMessageIndexes(),
    MessageAttachment.syncIndexes(),
    CallSession.syncIndexes(),
    Notification.syncIndexes(),
    syncBookingIndexes(),
    Payment.syncIndexes(),
    Assignment.syncIndexes(),
  ]);
};
