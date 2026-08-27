"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { todayISO } from "@/lib/format";
import type { MovementType } from "@/lib/supabase/types";

interface Category {
  id: string;
  name: string;
  subcategories: { id: string; name: string }[];
}

interface Props {
  accounts: { id: string; name: string }[];
  categories: Category[];
}

const initialState = (accounts: Props["accounts"]) => ({
  amount: "",
  description: "",
  accountId: accounts[0]?.id ?? "",
  categoryId: "",
  subcategoryId: "",
  type: "personal" as MovementType,
  isFixed: false,
});

export function QuickAddForm({ accounts, categories }: Props) {
  const supabase = createClient();
  const [form, setForm] = useState(initialState(accounts));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selectedCategory = categories.find((c) => c.id === form.categoryId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const { error } = await supabase.from("movements").insert({
      date: todayISO(),
      description: form.description,
      account_id: form.accountId,
      category_id: form.categoryId || null,
      subcategory_id: form.subcategoryId || null,
      amount: -Math.abs(Number(form.amount)),
      type: form.type,
      is_fixed_expense: form.isFixed,
    });

    setSaving(false);

    if (error) {
      setMessage(`Error: ${error.message}`);
      return;
    }

    setMessage("Gasto registrado ✓");
    setForm(initialState(accounts));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium">Monto</label>
        <input
          type="number"
          step="0.01"
          min="0"
          required
          inputMode="decimal"
          value={form.amount}
          onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          className="w-full rounded-md border border-neutral-300 px-3 py-3 text-lg dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Descripción</label>
        <input
          required
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Cuenta</label>
        <select
          value={form.accountId}
          onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">Categoría</label>
          <select
            value={form.categoryId}
            onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value, subcategoryId: "" }))}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="">Sin categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Subcategoría</label>
          <select
            value={form.subcategoryId}
            onChange={(e) => setForm((f) => ({ ...f, subcategoryId: e.target.value }))}
            disabled={!selectedCategory}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="">-</option>
            {selectedCategory?.subcategories.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            checked={form.type === "personal"}
            onChange={() => setForm((f) => ({ ...f, type: "personal" }))}
          />
          Personal
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            checked={form.type === "freelance"}
            onChange={() => setForm((f) => ({ ...f, type: "freelance" }))}
          />
          Freelance
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isFixed}
            onChange={(e) => setForm((f) => ({ ...f, isFixed: e.target.checked }))}
          />
          Fijo
        </label>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-md bg-neutral-900 px-3 py-3 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
      >
        {saving ? "Guardando..." : "Guardar gasto"}
      </button>

      {message && <p className="text-center text-sm">{message}</p>}
    </form>
  );
}
