export const ensureDatabaseIndexes = async (): Promise<void> => {
  const { User } = await import("@/infrastructure/database/models/User");
  const { Admin } = await import("@/infrastructure/database/models/Admin");
  const { Session } = await import("@/infrastructure/database/models/Session");
  const { Activity } = await import("@/infrastructure/database/models/Activity");
  const { Newsletter } = await import("@/infrastructure/database/models/Newsletter");
  const { Settings } = await import("@/infrastructure/database/models/Settings");
  const { AuditLog } = await import("@/infrastructure/database/models/AuditLog");

  await Promise.all([
    User.syncIndexes(),
    Admin.syncIndexes(),
    Session.syncIndexes(),
    Activity.syncIndexes(),
    Newsletter.syncIndexes(),
    Settings.syncIndexes(),
    AuditLog.syncIndexes(),
  ]);
};
