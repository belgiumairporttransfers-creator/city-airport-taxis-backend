import { describe, expect, it } from "vitest";
import { escapeRegex } from "@/shared/utils/escape-regex";

describe("escapeRegex", () => {
  it("escapes regex special characters", () => {
    expect(escapeRegex("test.*+?")).toBe("test\\.\\*\\+\\?");
  });
});
