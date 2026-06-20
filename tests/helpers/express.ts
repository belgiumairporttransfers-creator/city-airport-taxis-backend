/** Shared test helpers */
export const createMockRequest = (overrides: Record<string, unknown> = {}) =>
  ({
    method: "GET",
    headers: {},
    cookies: {},
    body: {},
    query: {},
    params: {},
    path: "/",
    originalUrl: "/",
    get: () => undefined,
    ...overrides,
  }) as unknown as import("express").Request;

export const createMockResponse = () => {
  const res: Partial<import("express").Response> & { statusCode?: number } = {};
  res.status = (code: number) => {
    res.statusCode = code;
    return res as import("express").Response;
  };
  res.json = () => res as import("express").Response;
  res.setHeader = () => res as import("express").Response;
  res.on = () => res as import("express").Response;
  return res as import("express").Response;
};
