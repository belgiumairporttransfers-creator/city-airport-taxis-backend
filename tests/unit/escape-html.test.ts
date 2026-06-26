import { describe, expect, it } from "vitest";
import { escapeHtml } from "@/shared/utils/escape-html";

describe("escapeHtml", () => {
  it("escapes HTML entities", () => {
    expect(escapeHtml(`<script>alert("xss") & 'test'</script>`)).toBe(
      "&lt;script&gt;alert(&quot;xss&quot;) &amp; &#39;test&#39;&lt;/script&gt;"
    );
  });
});
