const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

const underThousand = (n: number): string => {
  if (n < 20) return ONES[n];
  if (n < 100) {
    const remainder = n % 10;
    return `${TENS[Math.floor(n / 10)]}${remainder ? ` ${ONES[remainder]}` : ""}`;
  }

  const remainder = n % 100;
  return `${ONES[Math.floor(n / 100)]} Hundred${remainder ? ` ${underThousand(remainder)}` : ""}`;
};

const underMillion = (n: number): string => {
  if (n < 1000) return underThousand(n);

  const thousands = Math.floor(n / 1000);
  const remainder = n % 1000;
  return `${underThousand(thousands)} Thousand${remainder ? ` ${underThousand(remainder)}` : ""}`;
};

/** e.g. 141.5 → "One Hundred Forty One Euros And Fifty Cents Only" */
export const amountInWordsEur = (amount: number): string => {
  const safe = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  const euros = Math.floor(safe);
  const cents = Math.round((safe - euros) * 100);

  const euroPart =
    euros === 0
      ? "Zero Euros"
      : `${underMillion(euros)} Euro${euros === 1 ? "" : "s"}`;

  if (cents <= 0) {
    return `${euroPart} Only`;
  }

  const centPart = `${underThousand(cents)} Cent${cents === 1 ? "" : "s"}`;
  return `${euroPart} And ${centPart} Only`;
};
