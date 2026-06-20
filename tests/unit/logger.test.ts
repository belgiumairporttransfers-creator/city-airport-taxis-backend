import { describe, expect, it } from "vitest";
import { createChildLogger } from "@/shared/utils/logger";

describe("logger", () => {
  it("creates child loggers with metadata", () => {
    const child = createChildLogger({ module: "test" });
    expect(child).toBeDefined();
    expect(() => child.info("child logger smoke test")).not.toThrow();
  });
});
