"use client";

import { useMemo, useState } from "react";
import { CaretUpDownIcon } from "@phosphor-icons/react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { field } from "@/lib/ui";

export interface SubcategoryOption {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
}

/**
 * Subcategory picker that types to filter. Picking one reports its parent
 * category too, so the caller can fill the category in rather than making the
 * user choose it first.
 */
export function SubcategoryCombobox({
  options,
  value,
  onSelect,
  disabled,
  id,
}: {
  options: SubcategoryOption[];
  value: string;
  onSelect: (option: SubcategoryOption | null) => void;
  disabled?: boolean;
  id?: string;
}) {
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => options.find((o) => o.id === value) ?? null,
    [options, value]
  );

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        className={`${field} flex items-center justify-between gap-2 text-left`}
        disabled={disabled}
        id={id}
      >
        <span className={selected ? "truncate" : "truncate text-muted-foreground"}>
          {selected ? selected.name : "Buscar subcategoría..."}
        </span>
        <CaretUpDownIcon className="size-3.5 shrink-0 opacity-60" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--anchor-width) p-0">
        <Command>
          <CommandInput placeholder="Escribí para buscar..." />
          <CommandList>
            <CommandEmpty>Sin resultados.</CommandEmpty>
            {selected && (
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    onSelect(null);
                    setOpen(false);
                  }}
                  value="__clear__"
                >
                  Quitar subcategoría
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.id}
                  onSelect={() => {
                    onSelect(option);
                    setOpen(false);
                  }}
                  value={`${option.name} ${option.categoryName}`}
                >
                  <span className="truncate">{option.name}</span>
                  <span className="ml-auto shrink-0 text-muted-foreground">
                    {option.categoryName}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
