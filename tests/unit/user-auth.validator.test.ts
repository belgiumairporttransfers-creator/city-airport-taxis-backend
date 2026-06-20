import { describe, expect, it } from "vitest";
import { userUpdateProfileSchema } from "../../src/modules/auth/validators/user-auth.validator";

describe("userUpdateProfileSchema", () => {
  it("accepts valid profile updates", () => {
    const { error, value } = userUpdateProfileSchema.validate({
      firstName: "John",
      lastName: "Doe",
      phoneNumber: "+32 485 964 008",
      companyName: "City Airport Taxis",
    });

    expect(error).toBeUndefined();
    expect(value.firstName).toBe("John");
  });

  it("rejects empty payloads", () => {
    const { error } = userUpdateProfileSchema.validate({});
    expect(error?.message).toContain("At least one profile field is required");
  });

  it("rejects invalid first name", () => {
    const { error } = userUpdateProfileSchema.validate({ firstName: "" });
    expect(error).toBeDefined();
  });

  it("allows clearing optional string fields", () => {
    const { error, value } = userUpdateProfileSchema.validate({
      phoneNumber: "",
      companyName: "",
    });

    expect(error).toBeUndefined();
    expect(value.phoneNumber).toBe("");
  });
});
