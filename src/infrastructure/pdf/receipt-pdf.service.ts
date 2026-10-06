import fs from "fs";
import type { Browser, Page } from "puppeteer-core";
import { AppError } from "@/shared/errors/AppError";
import logger from "@/shared/utils/logger";
import { getPaymentReceiptPdfHtml } from "@/infrastructure/email/templates/booking.template";
import type { BookingEmailDetails } from "@/infrastructure/email/utils/booking-email-details";

const CHROME_CANDIDATES = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
].filter((value): value is string => Boolean(value));

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
    // TypeScript rewrites `import()` to `require()` under commonjs, which breaks
    // ESM-only puppeteer-core. Use a runtime Function so Node gets a real import().
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

      this.browserPromise = this.loadPuppeteer()
        .then(({ default: puppeteer }) =>
          puppeteer.launch({
            executablePath,
            headless: true,
            args: [
              "--no-sandbox",
              "--disable-setuid-sandbox",
              "--disable-dev-shm-usage",
              "--font-render-hinting=none",
            ],
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
        waitUntil: "load",
        timeout: 30_000,
      });
      await new Promise((resolve) => setTimeout(resolve, 500));

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
      });

      return Buffer.from(pdf);
    } catch (error) {
      logger.error("Failed to generate payment receipt PDF", { error });
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
