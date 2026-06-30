import cron, { type ScheduledTask } from "node-cron";
import { env } from "@/config/env";
import logger from "@/shared/utils/logger";
import assignmentService from "@/modules/assignments/services/assignment.service";

let scheduledTask: ScheduledTask | null = null;

export const startAssignmentScheduler = () => {
  if (scheduledTask) {
    return;
  }

  if (!env.ASSIGNMENT_CRON_ENABLED) {
    logger.info("Assignment expiry scheduler is disabled");
    return;
  }

  scheduledTask = cron.schedule(
    env.ASSIGNMENT_CRON_EXPRESSION,
    async () => {
      try {
        const expiredCount = await assignmentService.expirePendingAssignments();

        if (expiredCount > 0) {
          logger.info("Expired pending assignments", { expiredCount });
        }
      } catch (error) {
        logger.error("Assignment expiry scheduler failed", { error });
      }
    },
    {
      name: "assignment-expiry",
      timezone: env.ASSIGNMENT_CRON_TIMEZONE,
      noOverlap: true,
    }
  );

  logger.info("Assignment expiry scheduler started", {
    expression: env.ASSIGNMENT_CRON_EXPRESSION,
    timeoutSeconds: env.ASSIGNMENT_TIMEOUT_SECONDS,
  });
};

export const stopAssignmentScheduler = () => {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    logger.info("Assignment expiry scheduler stopped");
  }
};
