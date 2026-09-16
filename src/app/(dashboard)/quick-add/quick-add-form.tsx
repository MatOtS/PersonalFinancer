"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { todayISO } from "@/lib/format";
import type { CategoryKind, MovementType } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  SubcategoryCombobox,
  type SubcategoryOption,
} from "@/components/subcategory-combobox";

interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
  subcategories: { id: string; name: string }[];
}

interface Props {
  accounts: { id: string; name: string }[];
  categories: Category[];
}

const initialState = (accounts: Props["accounts"]) => ({
  amount: "",
  description: "",
  date: todayISO(),
  accountId: accounts[0]?.id ?? "",
  categoryId: "",
  subcategoryId: "",
  kind: "expense" as CategoryKind,
  type: "personal" as MovementType,
  isFixed: false,
});

export function QuickAddForm({ accounts, categories }: Props) {
  const [form, setForm] = useState(initialState(accounts));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Expense categories make no sense against a payment received, and vice
  // versa, so the list follows the Gasto/Ingreso choice.
  const visibleCategories = useMemo(
    () => categories.filter((c) => c.kind === form.kind),
    [categories, form.kind]
  );
  const selectedCategory = visibleCategories.find((c) => c.id === form.categoryId);

  // Flattened so the picker can search across every subcategory at once rather
  // than only those under an already-chosen category.
  const subcategoryOptions = useMemo<SubcategoryOption[]>(
    () =>
      visibleCategories.flatMap((c) =>
        c.subcategories.map((s) => ({
          id: s.id,
          name: s.name,
          categoryId: c.id,
          categoryName: c.name,
        }))
      ),
    [visibleCategories]
  );

  function setKind(kind: CategoryKind) {
    // The previously chosen category belongs to the other side of the ledger.
    setForm((f) => ({ ...f, kind, categoryId: "", subcategoryId: "" }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const magnitude = Math.abs(Number(form.amount));

    const { error } = await createClient()
      .from("movements")
      .insert({
        date: form.date,
        description: form.description,
        account_id: form.accountId,
        category_id: form.categoryId || null,
        subcategory_id: form.subcategoryId || null,
        amount: form.kind === "income" ? magnitude : -magnitude,
        type: form.type,
        is_fixed_expense: form.kind === "expense" && form.isFixed,
      });

    setSaving(false);

    if (error) {
      setMessage(`Error: ${error.message}`);
      return;
    }

    setMessage(form.kind === "income" ? "Ingreso registrado ✓" : "Gasto registrado ✓");
    setForm({ ...initialState(accounts), kind: form.kind, type: form.type });
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <ToggleGroup
        aria-label="Tipo de registro"
        className="w-full"
        onValueChange={(value) => {
          const next = value[0] as CategoryKind | undefined;
          if (next) setKind(next);
        }}
        value={[form.kind]}
        variant="outline"
      >
        <ToggleGroupItem className="flex-1" value="expense">
          Gasto
        </ToggleGroupItem>
        <ToggleGroupItem className="flex-1" value="income">
          Ingreso
        </ToggleGroupItem>
      </ToggleGroup>

      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="qa-amount">
          Monto
        </label>
        <input
          className="w-full rounded-md border border-input bg-transparent px-3 py-3 text-lg"
          id="qa-amount"
          inputMode="decimal"
          min="0"
          onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          required
          step="0.01"
          type="number"
          value={form.amount}
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="qa-date">
          Fecha
        </label>
        <input
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
          id="qa-date"
          onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          required
          type="date"
          value={form.date}
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="qa-description">
          Descripción
        </label>
        <input
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
          id="qa-description"
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          required
          value={form.description}
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="qa-account">
          Cuenta
        </label>
        <select
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
          id="qa-account"
          onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))}
          value={form.accountId}
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="qa-subcategory">
            Subcategoría
          </label>
          <SubcategoryCombobox
            disabled={subcategoryOptions.length === 0}
            id="qa-subcategory"
            onSelect={(option) =>
              setForm((f) => ({
                ...f,
                subcategoryId: option?.id ?? "",
                // Picking a subcategory decides the category, so it is filled
                // in rather than asked for.
                categoryId: option?.categoryId ?? f.categoryId,
              }))
            }
            options={subcategoryOptions}
            value={form.subcategoryId}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="qa-category">
            Categoría
          </label>
          <select
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            id="qa-category"
            onChange={(e) =>
              setForm((f) => ({ ...f, categoryId: e.target.value, subcategoryId: "" }))
            }
            value={form.categoryId}
          >
            <option value="">Sin categoría</option>
            {visibleCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {selectedCategory && form.subcategoryId && (
            <p className="text-muted-foreground text-xs">
              Rellenada desde la subcategoría.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input
            checked={form.type === "personal"}
            name="qa-type"
            onChange={() => setForm((f) => ({ ...f, type: "personal" }))}
            type="radio"
          />
          Personal
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            checked={form.type === "freelance"}
            name="qa-type"
            onChange={() => setForm((f) => ({ ...f, type: "freelance" }))}
            type="radio"
          />
          Freelance
        </label>
        {form.kind === "expense" && (
          <label className="flex items-center gap-2 text-sm">
            <input
              checked={form.isFixed}
              onChange={(e) => setForm((f) => ({ ...f, isFixed: e.target.checked }))}
              type="checkbox"
            />
            Fijo
          </label>
        )}
      </div>

      <Button className="w-full" disabled={saving} size="lg" type="submit">
        {saving ? "Guardando..." : form.kind === "income" ? "Guardar ingreso" : "Guardar gasto"}
      </Button>

      {message && <p className="text-center text-sm">{message}</p>}
    </form>
  );
}
