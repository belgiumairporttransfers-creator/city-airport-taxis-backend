export const ensureDatabaseIndexes = async (): Promise<void> => {
  const { User } = await import("@/infrastructure/database/models/User");
  const { Admin } = await import("@/infrastructure/database/models/Admin");
  const { Session } = await import("@/infrastructure/database/models/Session");
  const { Activity } = await import("@/infrastructure/database/models/Activity");
  const { Newsletter } = await import("@/infrastructure/database/models/Newsletter");
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
  const { DriverApplication } = await import("@/infrastructure/database/models/DriverApplication");

  await Promise.all([
    User.syncIndexes(),
    Admin.syncIndexes(),
    Session.syncIndexes(),
    Activity.syncIndexes(),
    Newsletter.syncIndexes(),
    NewsletterDraft.syncIndexes(),
    NewsletterCampaign.syncIndexes(),
    NewsletterCampaignRecipient.syncIndexes(),
    Settings.syncIndexes(),
    AuditLog.syncIndexes(),
    Customer.syncIndexes(),
    VehicleCategory.syncIndexes(),
    Vehicle.syncIndexes(),
    VehiclePricing.syncIndexes(),
    DriverApplication.syncIndexes(),
  ]);
};
