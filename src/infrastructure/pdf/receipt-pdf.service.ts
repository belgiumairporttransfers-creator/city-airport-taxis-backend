import fs from "fs";
import os from "os";
import path from "path";
import type { Browser, Page } from "puppeteer-core";
import { AppError } from "@/shared/errors/AppError";
import logger from "@/shared/utils/logger";
import { getPaymentReceiptPdfHtml } from "@/infrastructure/email/templates/booking.template";
import type { BookingEmailDetails } from "@/infrastructure/email/utils/booking-email-details";

const CHROME_CANDIDATES = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  "/usr/lib/chromium/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
].filter((value): value is string => Boolean(value));

const CHROME_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "--disable-software-rasterizer",
  "--no-zygote",
  "--font-render-hinting=none",
  "--hide-scrollbars",
  "--mute-audio",
  "--disable-extensions",
  "--disable-background-networking",
  "--disable-default-apps",
  "--disable-sync",
  "--disable-translate",
  "--metrics-recording-only",
  "--no-first-run",
];

const resolveChromePath = () => {
  for (const candidate of CHROME_CANDIDATES) {
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch {
      // ignore and try next candidate
    }
  }
  return null;
};

class ReceiptPdfService {
  private browserPromise: Promise<Browser> | null = null;

  private async loadPuppeteer() {
    const dynamicImport = new Function(
      "modulePath",
      "return import(modulePath)"
    ) as (modulePath: string) => Promise<typeof import("puppeteer-core")>;

    return dynamicImport("puppeteer-core");
  }

  private async getBrowser() {
    if (!this.browserPromise) {
      const executablePath = resolveChromePath();
      if (!executablePath) {
        throw new AppError(
          "PDF generation is unavailable. Chromium/Chrome is not installed on the server.",
          503
        );
      }

      const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "receipt-chrome-"));

      this.browserPromise = this.loadPuppeteer()
        .then(({ default: puppeteer }) =>
          puppeteer.launch({
            executablePath,
            headless: true,
            acceptInsecureCerts: true,
            pipe: true,
            dumpio: false,
            timeout: 45_000,
            protocolTimeout: 45_000,
            userDataDir,
            args: CHROME_ARGS,
          })
        )
        .catch((error) => {
          this.browserPromise = null;
          throw error;
        });
    }

    return this.browserPromise;
  }

  async generatePaymentReceiptPdf(
    customer: { firstName: string },
    booking: BookingEmailDetails
  ): Promise<Buffer> {
    const html = getPaymentReceiptPdfHtml(customer, booking);
    let page: Page | null = null;

    try {
      const browser = await this.getBrowser();
      page = await browser.newPage();
      await page.setContent(html, {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      });
      await new Promise((resolve) => setTimeout(resolve, 750));

      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        preferCSSPageSize: false,
        margin: {
          top: "10mm",
          right: "10mm",
          bottom: "10mm",
          left: "10mm",
        },
        timeout: 30_000,
      });

      return Buffer.from(pdf);
    } catch (error) {
      logger.error("Failed to generate payment receipt PDF", {
        error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to generate payment receipt PDF", 500);
    } finally {
      if (page) {
        await page.close().catch(() => undefined);
      }
    }
  }
}

export default new ReceiptPdfService();
