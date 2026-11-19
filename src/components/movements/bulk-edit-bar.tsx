"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import type { Account } from "@/data/accounts";
import type { CategoryGroups } from "@/data/categories";
import {
  BULK_FIELDS,
  buildPatch,
  type BulkInput,
  type RowPatch,
} from "@/domain/bulk-edit";
import { categoryOptions, subcategoryOptions } from "./movement-form-options";

type Props = {
  // How many movements are selected: the change applies to all of them.
  count: number;
  accounts: Account[];
  categories: CategoryGroups;
  // Gets the change both built (for rows in the browser) and as the user typed
  // it (for the server, which checks it again). Returns a message when the
  // change could not be applied (shown here).
  onApply: (
    patch: RowPatch,
    input: BulkInput,
  ) => Promise<string | null> | string | null;
  // Present when the selected movements can also be deleted.
  onDelete?: () => void;
};

const NONE = "__none";
const KINDS = [
  { value: "expense", label: "Gasto" },
  { value: "income", label: "Ingreso" },
];
const WORK_KINDS = [
  { value: "personal", label: "Personal" },
  { value: "freelance", label: "Freelance" },
];
const FIXED = [
  { value: "yes", label: "Sí" },
  { value: "no", label: "No" },
];

// Changes one field in every selected movement. The user picks the field, then
// its value, and presses the button; the same bar serves the import and the
// saved movements.
export const BulkEditBar = ({
  count,
  accounts,
  categories,
  onApply,
  onDelete,
}: Props) => {
  const [field, setField] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const choose = (next: string | null) => {
    setField(next);
    setValue("");
    setSubcategory("");
    setMessage(null);
  };

  const apply = async () => {
    const input: BulkInput = {
      field: field ?? "",
      value: value === NONE ? "" : value,
      subcategory: subcategory === NONE ? "" : subcategory,
    };
    const built = buildPatch(input);
    if ("error" in built) {
      setMessage(built.error);
      return;
    }
    setMessage((await onApply(built.patch, input)) ?? null);
  };

  const noneFirst = (
    options: { value: string; label: string }[],
    none: string,
  ) => [{ value: NONE, label: none }, ...options];

  return (
    <div
      role="group"
      aria-label="Editar los movimientos seleccionados"
      className="flex flex-wrap items-start gap-3 rounded-md border border-border bg-surface p-3"
    >
      <div className="w-56">
        <SelectField
          label="Campo a cambiar"
          name="bulk-field"
          options={BULK_FIELDS}
          value={field}
          onValueChange={choose}
          placeholder="Elige un campo"
        />
      </div>

      {field === "date" && (
        <div className="w-44">
          <TextField
            label="Nueva fecha"
            type="date"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
      )}
      {field === "description" && (
        <div className="w-64">
          <TextField
            label="Nueva descripción"
            autoComplete="off"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
      )}
      {field === "amount" && (
        <div className="w-40">
          <TextField
            label="Nuevo importe"
            inputMode="decimal"
            autoComplete="off"
            alignRight
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
      )}
      {field === "kind" && (
        <div className="w-44">
          <SelectField
            label="Nuevo tipo"
            name="bulk-kind"
            options={KINDS}
            value={value || null}
            onValueChange={(v) => setValue(v ?? "")}
            placeholder="Elige un tipo"
          />
        </div>
      )}
      {field === "account" && (
        <div className="w-52">
          <SelectField
            label="Nueva cuenta"
            name="bulk-account"
            options={accounts.map((a) => ({ value: a.id, label: a.name }))}
            value={value || null}
            onValueChange={(v) => setValue(v ?? "")}
            placeholder="Elige una cuenta"
          />
        </div>
      )}
      {field === "category" && (
        <>
          <div className="w-52">
            <SelectField
              label="Nueva categoría"
              name="bulk-category"
              options={noneFirst(categoryOptions(categories), "Sin categoría")}
              value={value || null}
              onValueChange={(v) => {
                setValue(v ?? "");
                setSubcategory("");
              }}
              placeholder="Elige una categoría"
            />
          </div>
          <div className="w-52">
            <SelectField
              label="Nueva subcategoría"
              name="bulk-subcategory"
              options={subcategoryOptions(
                categories,
                value && value !== NONE ? value : null,
              )}
              value={subcategory || null}
              onValueChange={(v) => setSubcategory(v ?? "")}
              placeholder="Elige una subcategoría"
              disabled={!value || value === NONE}
            />
          </div>
        </>
      )}
      {field === "workKind" && (
        <div className="w-44">
          <SelectField
            label="Nuevo valor"
            name="bulk-workkind"
            options={WORK_KINDS}
            value={value || null}
            onValueChange={(v) => setValue(v ?? "")}
            placeholder="Personal o freelance"
          />
        </div>
      )}
      {field === "isFixed" && (
        <div className="w-36">
          <SelectField
            label="Movimiento fijo"
            name="bulk-fixed"
            options={FIXED}
            value={value || null}
            onValueChange={(v) => setValue(v ?? "")}
            placeholder="Elige"
          />
        </div>
      )}

      <div className="flex items-center gap-2 pt-[26px]">
        <Button
          variant="primary"
          disabled={count === 0 || field === null}
          onClick={apply}
        >
          Aplicar a {count} {count === 1 ? "seleccionado" : "seleccionados"}
        </Button>
        {onDelete && (
          <Button
            variant="ghost-destructive"
            disabled={count === 0}
            onClick={onDelete}
          >
            Eliminar seleccionados
          </Button>
        )}
      </div>
      <p role="alert" className="w-full min-h-5 text-small text-negative">
        {message}
      </p>
    </div>
  );
};
