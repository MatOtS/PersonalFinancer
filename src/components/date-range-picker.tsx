"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function DateRangePicker({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(key: "from" | "to", value: string) {
    const params = new URLSearchParams(searchParams);
    params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <label className="flex items-center gap-1">
        Desde
        <input
          type="date"
          value={from}
          max={to}
          onChange={(e) => update("from", e.target.value)}
          className="rounded-md border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </label>
      <label className="flex items-center gap-1">
        Hasta
        <input
          type="date"
          value={to}
          min={from}
          onChange={(e) => update("to", e.target.value)}
          className="rounded-md border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </label>
    </div>
  );
}
