import { describe, expect, it, vi, beforeEach } from "vitest";

const sendMailMock = vi.fn();
const verifyMock = vi.fn();

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: (...args: unknown[]) => sendMailMock(...args),
      verify: (...args: unknown[]) => verifyMock(...args),
    })),
  },
}));

describe("email service", () => {
  beforeEach(async () => {
    vi.resetModules();
    sendMailMock.mockReset();
    verifyMock.mockReset();
  });

  it("sends email successfully", async () => {
    sendMailMock.mockResolvedValue({ messageId: "1" });
    const { default: emailService } = await import("@/infrastructure/email/email.service");

    const sent = await emailService.sendEmail({
      to: "user@example.com",
      subject: "Hello",
      html: "<p>Hi</p>",
    });

    expect(sent).toBe(true);
    expect(sendMailMock).toHaveBeenCalled();
  });

  it("reports unhealthy when verify fails", async () => {
    verifyMock.mockRejectedValue(new Error("smtp down"));
    const { default: emailService } = await import("@/infrastructure/email/email.service");

    const health = await emailService.pingHealth();

    expect(health.status).toBe("unhealthy");
  });
});
