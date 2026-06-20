import { describe, expect, it, beforeEach } from "vitest";
import {
  incrementRequestCount,
  incrementErrorCount,
  getMetricsSnapshot,
  resetMetrics,
} from "@/shared/observability/metrics";

describe("metrics", () => {
  beforeEach(() => {
    resetMetrics();
  });

  it("tracks request and error counts", () => {
    incrementRequestCount();
    incrementRequestCount();
    incrementErrorCount();

    const snapshot = getMetricsSnapshot();
    expect(snapshot.requests.total).toBe(2);
    expect(snapshot.requests.errors).toBe(1);
  });
});
