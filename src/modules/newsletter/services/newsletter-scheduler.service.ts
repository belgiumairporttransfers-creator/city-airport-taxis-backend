import cron, { type ScheduledTask } from "node-cron";
import { env } from "@/config/env";
import logger from "@/shared/utils/logger";
import newsletterSendService from "@/modules/newsletter/services/newsletter-send.service";

let scheduledTask: ScheduledTask | null = null;

const processScheduledNewsletters = async () => {
  await newsletterSendService.processDueScheduledCampaigns();
};

export const startNewsletterScheduler = () => {
  if (scheduledTask) return;

  if (!env.NEWSLETTER_CRON_ENABLED) {
    logger.info("Newsletter cron scheduler is disabled");
    return;
  }

  if (!cron.validate(env.NEWSLETTER_CRON_EXPRESSION)) {
    logger.error("Invalid NEWSLETTER_CRON_EXPRESSION — newsletter scheduler not started", {
      expression: env.NEWSLETTER_CRON_EXPRESSION,
    });
    return;
  }

  void processScheduledNewsletters();

  scheduledTask = cron.schedule(
    env.NEWSLETTER_CRON_EXPRESSION,
    async () => {
      await processScheduledNewsletters();
    },
    {
      name: "newsletter-scheduled-sends",
      timezone: env.NEWSLETTER_CRON_TIMEZONE,
      noOverlap: true,
    }
  );

  logger.info("Newsletter cron scheduler started", {
    expression: env.NEWSLETTER_CRON_EXPRESSION,
    timezone: env.NEWSLETTER_CRON_TIMEZONE,
  });
};

export const stopNewsletterScheduler = () => {
  if (!scheduledTask) return;

  void scheduledTask.stop();
  scheduledTask = null;
  logger.info("Newsletter cron scheduler stopped");
};
