// The exchange rate of a foreign currency (work item 005): written by the user
// in either direction, converted to euros with exact integer arithmetic.
import { divideRoundHalfEvenBig } from "../rounding";

export const INVALID_RATE = "Introduce un tipo de cambio válido";

export type RateDirection = "euroPerUnit" | "unitPerEuro";

export type Rate = {
  direction: RateDirection;
  // The rate times a million, as written: 0,92 is 920000.
  micros: number;
};

const MICROS = BigInt(1_000_000);

// "0,92" or "1,0875": more than zero, up to six decimals, a comma as in the
// rest of the app. Empty, 0, negative or not a number is refused.
export function parseRate(
  raw: string,
  direction: RateDirection,
): { rate: Rate } | { error: string } {
  const match = /^(\d{1,6})(?:,(\d{1,6}))?$/.exec(raw.trim());
  if (!match) return { error: INVALID_RATE };
  const [, whole = "0", decimals = ""] = match;
  const micros = Number(whole) * 1_000_000 + Number(decimals.padEnd(6, "0"));
  return micros === 0
    ? { error: INVALID_RATE }
    : { rate: { direction, micros } };
}

// Cents in the foreign currency to cents in euros, rounded to the nearest cent
// and half to the even one.
export function toEuroCents(foreignCents: number, rate: Rate): number {
  const amount = BigInt(foreignCents);
  const micros = BigInt(rate.micros);
  const euros =
    rate.direction === "euroPerUnit"
      ? divideRoundHalfEvenBig(amount * micros, MICROS)
      : divideRoundHalfEvenBig(amount * MICROS, micros);
  return Number(euros);
}

// The rate the other way round, as the text the user sees ("1,0870"): four
// decimals, rounded half to the even.
export function otherDirectionText(rate: Rate): string {
  // 1 / (micros / 1e6) in ten-thousandths: 1e6 * 1e4 / micros.
  const tenThousandths = divideRoundHalfEvenBig(
    BigInt(1_000_000) * BigInt(10_000),
    BigInt(rate.micros),
  );
  const whole = tenThousandths / BigInt(10_000);
  const decimals = (tenThousandths % BigInt(10_000))
    .toString()
    .padStart(4, "0");
  return `${whole},${decimals}`;
}
