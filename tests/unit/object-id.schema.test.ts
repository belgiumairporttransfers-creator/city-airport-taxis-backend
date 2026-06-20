import { describe, expect, it } from "vitest";
import { idParamSchema, sessionIdParamSchema } from "@/shared/validators/object-id.schema";

describe("object id schemas", () => {
  it("accepts valid newsletter id param", () => {
    const { error } = idParamSchema.validate({ id: "507f1f77bcf86cd799439011" });
    expect(error).toBeUndefined();
  });

  it("rejects invalid session id param", () => {
    const { error } = sessionIdParamSchema.validate({ sessionId: "not-an-id" });
    expect(error).toBeDefined();
  });
});
