import crypto from "crypto";

export const generateCsrfToken = (): string => crypto.randomBytes(32).toString("hex");
