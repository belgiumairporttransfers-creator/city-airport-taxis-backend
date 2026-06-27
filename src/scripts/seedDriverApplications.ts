import mongoose from "mongoose";
import { Admin } from "@/infrastructure/database/models/Admin";
import { DriverApplication } from "@/infrastructure/database/models/DriverApplication";
import { Notification } from "@/infrastructure/database/models/Notification";
import { User } from "@/infrastructure/database/models/User";
import { env } from "@/config/env";
import notificationService from "@/modules/notifications/services/notification.service";
import logger from "@/shared/utils/logger";
import {
  DRIVER_SEED_COUNT,
  sampleDriverApplications,
  type SampleDriverApplication,
} from "@/scripts/data/driver-applications.samples";

const buildDriverSeedNotification = (application: SampleDriverApplication, entityId: string) => {
  const name = `${application.firstName} ${application.lastName}`;

  return {
    title: "New Driver Application",
    message: `${name} submitted a driver application.`,
    type: "driver.application.submitted",
    severity: "info" as const,
    entityType: "driver" as const,
    entityId,
    actionUrl: `/drivers/${entityId}`,
  };
};

const seedDriverApplications = async () => {
  try {
    await mongoose.connect(env.MONGODB_URI);
    logger.info("Connected to MongoDB for driver application seeding");

    const deletedDrivers = await DriverApplication.deleteMany({});
    const deletedDriverUsers = await User.deleteMany({ role: "driver" });
    const deletedDriverNotifications = await Notification.deleteMany({ entityType: "driver" });

    logger.info("Cleared existing driver data", {
      driverApplications: deletedDrivers.deletedCount ?? 0,
      driverUsers: deletedDriverUsers.deletedCount ?? 0,
      driverNotifications: deletedDriverNotifications.deletedCount ?? 0,
    });

    const admin = await Admin.findOne().sort({ createdAt: 1 });
    const reviewedBy = admin?._id;

    if (!reviewedBy) {
      logger.warn("No admin found — review metadata will be omitted. Run seed:admin first.");
    }

    let created = 0;
    let notificationsCreated = 0;

    for (const application of sampleDriverApplications) {
      const needsReviewMeta = [
        "under_review",
        "changes_requested",
        "approved",
        "rejected",
        "suspended",
      ].includes(application.status);

      const record = await DriverApplication.create({
        ...application,
        licensePlate: application.licensePlate.toUpperCase().replace(/\s+/g, ""),
        ...(needsReviewMeta && reviewedBy ? { reviewedBy } : {}),
      });

      created += 1;

      await notificationService.notifyAdmins(
        buildDriverSeedNotification(application, record._id.toString())
      );
      notificationsCreated += 1;

      if (created % 25 === 0 || created === sampleDriverApplications.length) {
        logger.info(`Seeded ${created}/${sampleDriverApplications.length} driver applications`);
      }
    }

    logger.info(
      `Driver application seeding completed — ${created} created (${DRIVER_SEED_COUNT} target), ${notificationsCreated} new driver application notifications`
    );
    process.exit(0);
  } catch (error) {
    logger.error("Error seeding driver applications:", error);
    process.exit(1);
  }
};

seedDriverApplications();
