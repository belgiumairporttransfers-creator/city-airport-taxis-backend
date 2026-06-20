export const getCsrfHeaderFromResponse = (
  response: { headers: Record<string, unknown> }
): Record<string, string> => {
  const token = response.headers["x-csrf-token"];
  return typeof token === "string" ? { "X-CSRF-Token": token } : {};
};

export const TEST_ADMIN = {
  firstName: "Integration",
  lastName: "Admin",
  email: "integration-admin@test.com",
  password: "Password123!",
  role: "admin" as const,
};

export const TEST_USER = {
  firstName: "Integration",
  lastName: "User",
  email: "integration-user@test.com",
  password: "Password123!",
};
