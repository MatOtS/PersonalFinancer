export function KpiCard({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  const toneClass =
    tone === "up" ? "text-emerald-600 dark:text-emerald-400" : tone === "down" ? "text-red-600 dark:text-red-400" : "";

  return (
    <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <p className="text-xs font-medium text-neutral-500">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${toneClass}`}>{value}</p>
    </div>
  );
}
