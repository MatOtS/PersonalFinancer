"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { matchPreset, PERIOD_PRESETS, presetRange } from "@/domain/dashboard";

// The period of a dashboard: three presets and two dates. It writes the period
// in the address, so the page (a Server Component) reads it from there.
export const PeriodPicker = ({
  from,
  to,
  today,
}: {
  from: string;
  to: string;
  today: string;
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = matchPreset(from, to, today);

  const go = (next: { from: string; to: string }) => {
    const params = new URLSearchParams(searchParams);
    params.set("from", next.from);
    params.set("to", next.to);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div
      role="group"
      aria-label="Periodo"
      className="flex flex-wrap items-end gap-3"
    >
      <div className="flex gap-2">
        {PERIOD_PRESETS.map((preset) => (
          <Button
            key={preset.id}
            variant={active === preset.id ? "primary" : "secondary"}
            aria-pressed={active === preset.id}
            onClick={() => go(presetRange(preset.id, today))}
          >
            {preset.label}
          </Button>
        ))}
      </div>
      <div className="w-40">
        <TextField
          label="Desde"
          type="date"
          value={from}
          max={to}
          // Clearing a date does nothing: a period always has both ends.
          onChange={(event) =>
            event.target.value && go({ from: event.target.value, to })
          }
        />
      </div>
      <div className="w-40">
        <TextField
          label="Hasta"
          type="date"
          value={to}
          min={from}
          onChange={(event) =>
            event.target.value && go({ from, to: event.target.value })
          }
        />
      </div>
    </div>
  );
};
