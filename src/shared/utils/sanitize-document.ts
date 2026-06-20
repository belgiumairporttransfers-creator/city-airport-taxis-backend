/** Remove fields that must never appear in API JSON (used by Mongoose toJSON). */
export const stripSensitiveFields = (doc: Record<string, unknown>): Record<string, unknown> => {
  delete doc.password;
  delete doc.resetPasswordToken;
  delete doc.resetPasswordExpires;
  delete doc.emailVerificationToken;
  delete doc.emailVerificationExpires;
  delete doc.failedLoginAttempts;
  delete doc.lockUntil;
  delete doc.passwordChangedAt;
  delete doc.__v;
  return doc;
};
