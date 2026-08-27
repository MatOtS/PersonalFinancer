import { createClient } from "@/lib/supabase/server";
import { getAccounts, getCategoriesWithSubcategories } from "@/lib/queries/catalog";
import { getUserSettings } from "@/lib/queries/invoices";
import {
  updateSettingsAction,
  addAccountAction,
  addCategoryAction,
  addSubcategoryAction,
  addFixedExpenseAction,
  addCategoryKeywordAction,
} from "./actions";

export default async function SettingsPage() {
  const supabase = await createClient();
  const [accounts, categories, settings] = await Promise.all([
    getAccounts(supabase),
    getCategoriesWithSubcategories(supabase),
    getUserSettings(supabase),
  ]);

  return (
    <div className="max-w-2xl space-y-8">
      <h2 className="text-lg font-semibold">Ajustes</h2>

      <section className="space-y-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <h3 className="text-sm font-semibold">Facturación</h3>
        <form action={updateSettingsAction} className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            IRPF por defecto (%)
            <input
              name="default_irpf_pct"
              type="number"
              step="0.01"
              defaultValue={settings.default_irpf_pct}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
            />
          </label>
          <label className="space-y-1 text-sm">
            IVA por defecto (%)
            <input
              name="default_iva_pct"
              type="number"
              step="0.01"
              defaultValue={settings.default_iva_pct}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
            />
          </label>
          <label className="space-y-1 text-sm">
            Formato n.º factura
            <input
              name="invoice_number_format"
              defaultValue={settings.invoice_number_format}
              placeholder="YYYY-NNN"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
            />
          </label>
          <label className="space-y-1 text-sm">
            Próximo correlativo
            <input
              name="invoice_number_next"
              type="number"
              min="1"
              defaultValue={settings.invoice_number_next}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
            />
          </label>
          <button
            type="submit"
            className="sm:col-span-2 rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
          >
            Guardar
          </button>
        </form>
      </section>

      <section className="space-y-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <h3 className="text-sm font-semibold">Cuentas</h3>
        <ul className="flex flex-wrap gap-2 text-sm">
          {accounts.map((a) => (
            <li key={a.id} className="rounded-full bg-neutral-100 px-3 py-1 dark:bg-neutral-800">
              {a.name}
            </li>
          ))}
        </ul>
        <form action={addAccountAction} className="flex gap-2">
          <input
            name="name"
            required
            placeholder="Nueva cuenta"
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <button className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900">
            Agregar
          </button>
        </form>
      </section>

      <section className="space-y-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <h3 className="text-sm font-semibold">Categorías y subcategorías</h3>
        <ul className="space-y-2 text-sm">
          {categories.map((c) => (
            <li key={c.id}>
              <span className="font-medium">{c.name}</span>
              {c.subcategories.length > 0 && (
                <span className="text-neutral-500"> — {c.subcategories.map((s) => s.name).join(", ")}</span>
              )}
            </li>
          ))}
        </ul>

        <div className="grid gap-3 sm:grid-cols-2">
          <form action={addCategoryAction} className="flex gap-2">
            <input
              name="name"
              required
              placeholder="Nueva categoría"
              className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
            <button className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900">
              +
            </button>
          </form>

          <form action={addSubcategoryAction} className="flex gap-2">
            <select
              name="category_id"
              required
              className="rounded-md border border-neutral-300 px-2 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              name="name"
              required
              placeholder="Nueva subcategoría"
              className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
            <button className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900">
              +
            </button>
          </form>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <h3 className="text-sm font-semibold">Palabras clave para autocategorización</h3>
        <p className="text-xs text-neutral-500">
          Si la descripción de un movimiento importado contiene la palabra, se le asigna la categoría automáticamente.
        </p>
        <form action={addCategoryKeywordAction} className="flex flex-wrap gap-2">
          <input
            name="keyword"
            required
            placeholder="ej. netflix"
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <select
            name="category_id"
            required
            className="rounded-md border border-neutral-300 px-2 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900">
            Agregar
          </button>
        </form>
      </section>

      <section className="space-y-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <h3 className="text-sm font-semibold">Gastos fijos</h3>
        <form action={addFixedExpenseAction} className="grid gap-2 sm:grid-cols-2">
          <input
            name="name"
            required
            placeholder="Nombre (ej. Alquiler)"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <input
            name="amount"
            type="number"
            step="0.01"
            required
            placeholder="Monto"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <select
            name="frequency"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="monthly">Mensual</option>
            <option value="bimonthly">Bimestral</option>
            <option value="quarterly">Trimestral</option>
            <option value="annual">Anual</option>
          </select>
          <select
            name="account_id"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="">Sin cuenta</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <select
            name="category_id"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 sm:col-span-2"
          >
            <option value="">Sin categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button className="sm:col-span-2 rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900">
            Agregar gasto fijo
          </button>
        </form>
      </section>
    </div>
  );
}
