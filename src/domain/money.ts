// Money is always integer cents (ADR-06). The text typed by the user is
// converted at the edge with `parseAmount`, and `formatCents` turns cents back
// into text for the screen. Nothing in between touches decimals.

export const INVALID_AMOUNT = "Introduce un importe válido";

export type ParsedAmount = { cents: number } | { error: string };

// An optional minus, the whole part (plain, or with a dot every three digits)
// and an optional comma with one or two decimals. The dot is only for
// thousands: "12.5" is refused because it could mean 12,5 or 125.
const AMOUNT = /^(-?)(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/;

// The biggest amount JavaScript keeps exact; anything above is refused.
const MAX_CENTS = BigInt(Number.MAX_SAFE_INTEGER);

// An empty text is zero. Anything else must be an amount with up to two
// decimals; the result is the amount in cents, or the message to show.
export function parseAmount(raw: string): ParsedAmount {
  const text = raw.trim();
  if (text === "") return { cents: 0 };

  const match = AMOUNT.exec(text);
  if (!match) return { error: INVALID_AMOUNT };

  // The pattern always captures the sign and the whole part (the sign can be
  // empty); the defaults only satisfy `noUncheckedIndexedAccess`.
  const [, sign = "", whole = "0", decimals = ""] = match;
  // BigInt so that a huge number is detected instead of silently rounded.
  const cents =
    BigInt(whole.replaceAll(".", "")) * BigInt(100) +
    BigInt(decimals.padEnd(2, "0"));
  if (cents > MAX_CENTS) return { error: INVALID_AMOUNT };

  // "-0" is zero, not minus zero.
  if (cents === BigInt(0)) return { cents: 0 };
  return { cents: sign === "-" ? -Number(cents) : Number(cents) };
}

// 125000 is "1.250,00 €". Grouping is done by hand because the Spanish
// `Intl` format leaves four-digit numbers ungrouped ("1250,00").
export function formatCents(cents: number): string {
  const absolute = Math.abs(cents);
  const whole = Math.trunc(absolute / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const decimals = (absolute % 100).toString().padStart(2, "0");
  return `${cents < 0 ? "-" : ""}${whole},${decimals} €`;
}
