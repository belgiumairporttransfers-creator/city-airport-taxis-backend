import { describe, expect, it } from "vitest";
import { amountInWordsEur } from "@/infrastructure/email/utils/amount-in-words";

describe("amountInWordsEur", () => {
  it("formats whole euros", () => {
    expect(amountInWordsEur(141)).toBe("One Hundred Forty One Euros Only");
  });

  it("formats euros with cents", () => {
    expect(amountInWordsEur(12.5)).toBe("Twelve Euros And Fifty Cents Only");
  });

  it("handles zero", () => {
    expect(amountInWordsEur(0)).toBe("Zero Euros Only");
  });
});
