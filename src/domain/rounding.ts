// Integer division that rounds to the nearest whole number and, when it falls
// exactly in the middle, to the even one (0,925 is 0,92 and 0,935 is 0,94).
// Used wherever cents are computed from a rate or a quantity, so the rule is
// written once. Works with non-negative numbers, which is all money needs here.
export function divideRoundHalfEven(numerator: number, denominator: number) {
  const whole = Math.floor(numerator / denominator);
  const remainder = numerator - whole * denominator;
  const twice = remainder * 2;
  if (twice < denominator) return whole;
  if (twice > denominator) return whole + 1;
  return whole % 2 === 0 ? whole : whole + 1;
}

// The same rule with BigInt, for products too big for a plain number (an
// amount in cents times a rate with six decimals).
export function divideRoundHalfEvenBig(numerator: bigint, denominator: bigint) {
  const whole = numerator / denominator;
  const remainder = numerator - whole * denominator;
  const twice = remainder * BigInt(2);
  if (twice < denominator) return whole;
  if (twice > denominator) return whole + BigInt(1);
  return whole % BigInt(2) === BigInt(0) ? whole : whole + BigInt(1);
}
