const roundMoney = (value: number) => Math.round(value * 100) / 100;

/** Always use settings commission percent (payment method no longer exempts). */
export const getEffectiveCommissionPercent = (
  _paymentMethod: string | undefined | null,
  settingsPercent: number
) =>
  Number.isFinite(settingsPercent) ? Math.min(100, Math.max(0, settingsPercent)) : 0;

/** Platform commission % deducted from the customer trip fare before paying the driver. */
export const calculatePlatformFee = (tripFare: number, commissionPercent: number) => {
  const safeFare = Number.isFinite(tripFare) ? tripFare : 0;
  const safePercent = Number.isFinite(commissionPercent)
    ? Math.min(100, Math.max(0, commissionPercent))
    : 0;

  return roundMoney((safeFare * safePercent) / 100);
};

export const calculateDriverEarning = (
  tripFare: number,
  commissionPercent: number,
  paymentMethod?: string | null
) => {
  const safeFare = Number.isFinite(tripFare) ? tripFare : 0;
  const effectivePercent = getEffectiveCommissionPercent(paymentMethod, commissionPercent);
  const platformFee = calculatePlatformFee(safeFare, effectivePercent);

  return roundMoney(Math.max(0, safeFare - platformFee));
};

export const toDriverPricing = (
  tripFare: number,
  commissionPercent: number,
  paymentMethod?: string | null
) => {
  const safeFare = Number.isFinite(tripFare) ? tripFare : 0;
  const effectivePercent = getEffectiveCommissionPercent(paymentMethod, commissionPercent);
  const platformFee = calculatePlatformFee(safeFare, effectivePercent);
  const driverEarning = roundMoney(Math.max(0, safeFare - platformFee));

  return {
    total: safeFare,
    commissionPercent: effectivePercent,
    platformFee,
    driverEarning,
  };
};
