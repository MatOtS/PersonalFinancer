"use client";

import { Select } from "@base-ui/react/select";
import { CaretDownIcon, CheckIcon } from "@phosphor-icons/react/ssr";
import { useId } from "react";

export type SelectOption = { value: string; label: string };

type SelectFieldProps = {
  label: string;
  // Sent with the form under this name (Base UI keeps a hidden input).
  name: string;
  options: SelectOption[];
  // Null while nothing is chosen.
  value: string | null;
  onValueChange: (value: string | null) => void;
  placeholder: string;
  error?: string;
  disabled?: boolean;
};

// A labelled list to choose from, the counterpart of `TextField`: the label is
// always visible and an error shows under the field, linked to it for screen
// readers. Built on Base UI (ADR-20).
export const SelectField = ({
  label,
  name,
  options,
  value,
  onValueChange,
  placeholder,
  error,
  disabled,
}: SelectFieldProps) => {
  const errorId = `${useId()}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      <Select.Root
        name={name}
        items={options}
        value={value}
        onValueChange={(next) => onValueChange(next)}
        disabled={disabled}
      >
        <Select.Label className="text-small font-semibold">
          {label}
        </Select.Label>
        <Select.Trigger
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`flex h-10 items-center justify-between gap-2 rounded-sm border bg-surface px-3 text-left text-body disabled:opacity-45 ${
            error ? "border-negative" : "border-control-border"
          }`}
        >
          <Select.Value placeholder={placeholder} />
          <Select.Icon className="text-text-muted">
            <CaretDownIcon size={16} />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner sideOffset={4} className="z-50">
            <Select.Popup className="max-h-64 min-w-[var(--anchor-width)] overflow-y-auto rounded-md border border-border bg-raised p-1 shadow-raised">
              <Select.List>
                {options.map((option) => (
                  <Select.Item
                    key={option.value}
                    value={option.value}
                    className="flex cursor-default items-center justify-between gap-3 rounded-sm px-3 py-2 text-body data-[highlighted]:bg-accent-soft"
                  >
                    <Select.ItemText>{option.label}</Select.ItemText>
                    <Select.ItemIndicator className="text-accent">
                      <CheckIcon size={16} />
                    </Select.ItemIndicator>
                  </Select.Item>
                ))}
              </Select.List>
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
      {error && (
        <p id={errorId} className="text-small text-negative">
          {error}
        </p>
      )}
    </div>
  );
};
