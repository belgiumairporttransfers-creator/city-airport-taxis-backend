import { env } from "@/config/env";
import { AppError } from "@/shared/errors/AppError";
import logger from "@/shared/utils/logger";

type RecaptchaVerifyResponse = {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  "error-codes"?: string[];
};

export async function verifyRecaptchaToken(token?: string): Promise<void> {
  const secret = env.RECAPTCHA_SECRET_KEY;

  // Skip verification when secret is not configured (local/test).
  if (!secret) {
    return;
  }

  if (!token?.trim()) {
    throw new AppError("Please complete the captcha verification", 400);
  }

  const body = new URLSearchParams({
    secret,
    response: token.trim(),
  });

  let result: RecaptchaVerifyResponse;

  try {
    const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    result = (await response.json()) as RecaptchaVerifyResponse;
  } catch (error) {
    logger.error("reCAPTCHA verification request failed", { error });
    throw new AppError("Captcha verification failed. Please try again.", 400);
  }

  if (!result.success) {
    logger.warn("reCAPTCHA verification rejected", {
      errorCodes: result["error-codes"],
    });
    throw new AppError("Captcha verification failed. Please try again.", 400);
  }
}
