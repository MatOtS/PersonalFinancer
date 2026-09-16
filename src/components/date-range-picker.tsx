"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  PERIOD_PRESETS,
  matchPreset,
  presetRange,
  type PeriodPreset,
} from "@/lib/format";

export function DateRangePicker({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activePreset = matchPreset(from, to);

  function push(next: { from?: string; to?: string }) {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(next)) params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      <ToggleGroup
        aria-label="Período"
        onValueChange={(value) => {
          const preset = value[0] as PeriodPreset | undefined;
          if (preset) push(presetRange(preset));
        }}
        size="sm"
        value={activePreset ? [activePreset] : []}
        variant="outline"
      >
        {PERIOD_PRESETS.map((preset) => (
          <ToggleGroupItem key={preset.id} value={preset.id}>
            {preset.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1">
          Desde
          <input
            className="rounded-md border border-input bg-transparent px-2 py-1"
            max={to}
            onChange={(e) => push({ from: e.target.value })}
            type="date"
            value={from}
          />
        </label>
        <label className="flex items-center gap-1">
          Hasta
          <input
            className="rounded-md border border-input bg-transparent px-2 py-1"
            min={from}
            onChange={(e) => push({ to: e.target.value })}
            type="date"
            value={to}
          />
        </label>
      </div>
    </div>
  );
}
