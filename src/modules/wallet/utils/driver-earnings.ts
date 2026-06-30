const roundMoney = (value: number) => Math.round(value * 100) / 100;

/** Platform commission % deducted from the customer trip fare before paying the driver. */
export const calculatePlatformFee = (tripFare: number, commissionPercent: number) => {
  const safeFare = Number.isFinite(tripFare) ? tripFare : 0;
  const safePercent = Number.isFinite(commissionPercent)
    ? Math.min(100, Math.max(0, commissionPercent))
    : 0;

  return roundMoney((safeFare * safePercent) / 100);
};

export const calculateDriverEarning = (tripFare: number, commissionPercent: number) => {
  const safeFare = Number.isFinite(tripFare) ? tripFare : 0;
  const platformFee = calculatePlatformFee(safeFare, commissionPercent);

  return roundMoney(Math.max(0, safeFare - platformFee));
};

export const toDriverPricing = (tripFare: number, commissionPercent: number) => ({
  driverEarning: calculateDriverEarning(tripFare, commissionPercent),
});
