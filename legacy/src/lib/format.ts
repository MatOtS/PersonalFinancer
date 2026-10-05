export const LOCALE = "es-ES";
export const CURRENCY = "EUR";

const currencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY,
  maximumFractionDigits: 2,
});

export function formatCurrency(amount: number) {
  return currencyFormatter.format(amount);
}

/** Compact euros for chart axes and tight KPI tiles (e.g. "1,2 mil €"). */
export function formatCompactCurrency(amount: number) {
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: CURRENCY,
    notation: "compact",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPercent(value: number, fractionDigits = 1) {
  return `${value.toFixed(fractionDigits)} %`;
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat(LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

/**
 * Noon anchor keeps a plain `YYYY-MM-DD` from shifting a day when the runtime
 * timezone is behind UTC.
 */
export function parseIsoCalendarDate(isoDate: string) {
  return new Date(`${isoDate}T12:00:00`);
}

/** Short axis label for date-series charts (e.g. "14 mar"). */
export function formatDayMonth(isoDate: string) {
  return parseIsoCalendarDate(isoDate).toLocaleDateString(LOCALE, {
    day: "numeric",
    month: "short",
  });
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function monthAgoISO() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
}

export type PeriodPreset = "week" | "month" | "quarter";

export const PERIOD_PRESETS: { id: PeriodPreset; label: string }[] = [
  { id: "week", label: "Última semana" },
  { id: "month", label: "Último mes" },
  { id: "quarter", label: "Último trimestre" },
];

/**
 * Rolling windows counted back from today, matching how `monthAgoISO` already
 * builds the default range. Month arithmetic is calendar-based, so a preset
 * fired on the 31st lands on the nearest valid day of the earlier month.
 */
export function presetRange(preset: PeriodPreset): { from: string; to: string } {
  const d = new Date();
  if (preset === "week") d.setDate(d.getDate() - 7);
  if (preset === "month") d.setMonth(d.getMonth() - 1);
  if (preset === "quarter") d.setMonth(d.getMonth() - 3);
  return { from: d.toISOString().slice(0, 10), to: todayISO() };
}

/** Which preset, if any, the current range corresponds to. */
export function matchPreset(from: string, to: string): PeriodPreset | null {
  return (
    PERIOD_PRESETS.find((p) => {
      const r = presetRange(p.id);
      return r.from === from && r.to === to;
    })?.id ?? null
  );
}
