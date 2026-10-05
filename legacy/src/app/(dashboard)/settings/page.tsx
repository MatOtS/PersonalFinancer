import { createClient } from "@/lib/supabase/server";
import { getAccounts, getCategoriesWithSubcategories } from "@/lib/queries/catalog";
import { getClients, getUserSettings } from "@/lib/queries/invoices";
import { IssuerLogoUpload } from "@/components/issuer-logo-upload";
import {
  updateSettingsAction,
  addAccountAction,
  addCategoryAction,
  addSubcategoryAction,
  addFixedExpenseAction,
  addCategoryKeywordAction,
  updateIssuerAction,
  updateClientAction,
} from "./actions";
import { Button } from "@/components/ui/button";
import { field, fieldCompact, fieldLabel, section } from "@/lib/ui";
import { DashboardHeading } from "@/components/dashboard-layout";

export default async function SettingsPage() {
  const supabase = await createClient();
  const [accounts, categories, settings, clients] = await Promise.all([
    getAccounts(supabase),
    getCategoriesWithSubcategories(supabase),
    getUserSettings(supabase),
    getClients(supabase),
  ]);

  return (
    <div className="max-w-2xl space-y-8">
      <DashboardHeading
        eyebrow="Administración"
        subtitle="Tus datos de facturación, cuentas, categorías y gastos fijos."
        title="Ajustes"
      />

      <section className={section}>
        <div>
          <h3 className="font-semibold text-base tracking-tight">Tus datos de facturación</h3>
          <p className="text-muted-foreground text-sm">
            Aparecen como emisor en cada factura que generes.
          </p>
        </div>
        <form action={updateIssuerAction} className="grid gap-3 sm:grid-cols-2">
          <label className={`${fieldLabel} sm:col-span-2`}>
            Nombre o razón social
            <input className={field} defaultValue={settings.issuer_name ?? ""} name="issuer_name" />
          </label>
          <label className={fieldLabel}>
            NIF
            <input className={field} defaultValue={settings.issuer_tax_id ?? ""} name="issuer_tax_id" />
          </label>
          <label className={fieldLabel}>
            Teléfono
            <input className={field} defaultValue={settings.issuer_phone ?? ""} name="issuer_phone" />
          </label>
          <label className={`${fieldLabel} sm:col-span-2`}>
            Dirección
            <input className={field} defaultValue={settings.issuer_address ?? ""} name="issuer_address" />
          </label>
          <label className={fieldLabel}>
            Email
            <input className={field} defaultValue={settings.issuer_email ?? ""} name="issuer_email" type="email" />
          </label>
          <label className={fieldLabel}>
            IBAN
            <input className={field} defaultValue={settings.issuer_iban ?? ""} name="issuer_iban" />
          </label>
          <label className={fieldLabel}>
            Forma de cobro
            <input className={field} defaultValue={settings.payment_method} name="payment_method" />
          </label>
          <label className={fieldLabel}>
            Vencimiento por defecto (días)
            <input
              className={field}
              defaultValue={settings.default_due_days}
              min="0"
              name="default_due_days"
              type="number"
            />
          </label>
          <Button className="sm:col-span-2" type="submit">
            Guardar datos de facturación
          </Button>
        </form>

        <div className="space-y-2 border-border border-t pt-3">
          <p className="font-medium text-sm">Logo</p>
          <IssuerLogoUpload logoPath={settings.logo_path} />
        </div>
      </section>

      <section className={section}>
        <div>
          <h3 className="font-semibold text-base tracking-tight">Clientes</h3>
          <p className="text-muted-foreground text-sm">
            El CIF y la dirección son obligatorios en la factura; se guardan aquí y se reutilizan.
          </p>
        </div>
        {clients.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Todavía no hay clientes. Se crean al emitir una factura.
          </p>
        )}
        {clients.map((c) => (
          <form action={updateClientAction} className="grid gap-2 sm:grid-cols-2" key={c.id}>
            <input name="id" type="hidden" value={c.id} />
            <label className={fieldLabel}>
              Nombre
              <input className={field} defaultValue={c.name} name="name" required />
            </label>
            <label className={fieldLabel}>
              CIF / NIF
              <input className={field} defaultValue={c.tax_id ?? ""} name="tax_id" />
            </label>
            <label className={`${fieldLabel} sm:col-span-2`}>
              Dirección
              <input className={field} defaultValue={c.address ?? ""} name="address" />
            </label>
            <label className={fieldLabel}>
              Email
              <input className={field} defaultValue={c.email ?? ""} name="email" type="email" />
            </label>
            <div className="flex items-end">
              <Button type="submit" variant="outline">
                Guardar cliente
              </Button>
            </div>
          </form>
        ))}
      </section>

      <section className={section}>
        <h3 className="font-semibold text-base tracking-tight">Facturación</h3>
        <form action={updateSettingsAction} className="grid gap-3 sm:grid-cols-2">
          <label className={fieldLabel}>
            IRPF por defecto (%)
            <input
              name="default_irpf_pct"
              type="number"
              step="0.01"
              defaultValue={settings.default_irpf_pct}
              className={field}
            />
          </label>
          <label className={fieldLabel}>
            IVA por defecto (%)
            <input
              name="default_iva_pct"
              type="number"
              step="0.01"
              defaultValue={settings.default_iva_pct}
              className={field}
            />
          </label>
          <label className={fieldLabel}>
            Formato n.º factura
            <input
              name="invoice_number_format"
              defaultValue={settings.invoice_number_format}
              placeholder="YYYY-NNN"
              className={field}
            />
          </label>
          <label className={fieldLabel}>
            Próximo correlativo
            <input
              name="invoice_number_next"
              type="number"
              min="1"
              defaultValue={settings.invoice_number_next}
              className={field}
            />
          </label>
          <Button type="submit" className="sm:col-span-2">
            Guardar
          </Button>
        </form>
      </section>

      <section className={section}>
        <h3 className="font-semibold text-base tracking-tight">Cuentas</h3>
        <ul className="flex flex-wrap gap-2 text-sm">
          {accounts.map((a) => (
            <li key={a.id} className="rounded-full bg-muted px-3 py-1">
              {a.name}
            </li>
          ))}
        </ul>
        <form action={addAccountAction} className="flex gap-2">
          <input
            name="name"
            required
            placeholder="Nueva cuenta"
            className={`${field} flex-1`}
          />
          <Button>Agregar</Button>
        </form>
      </section>

      <section className={section}>
        <h3 className="font-semibold text-base tracking-tight">Categorías y subcategorías</h3>
        <ul className="space-y-2 text-sm">
          {categories.map((c) => (
            <li key={c.id}>
              <span className="font-medium">{c.name}</span>
              {c.subcategories.length > 0 && (
                <span className="text-muted-foreground"> — {c.subcategories.map((s) => s.name).join(", ")}</span>
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
              className={`${field} flex-1`}
            />
            <Button>+</Button>
          </form>

          <form action={addSubcategoryAction} className="flex gap-2">
            <select
              name="category_id"
              required
              className={fieldCompact}
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
              className={`${field} flex-1`}
            />
            <Button>+</Button>
          </form>
        </div>
      </section>

      <section className={section}>
        <h3 className="font-semibold text-base tracking-tight">Palabras clave para autocategorización</h3>
        <p className="text-xs text-muted-foreground">
          Si la descripción de un movimiento importado contiene la palabra, se le asigna la categoría automáticamente.
        </p>
        <form action={addCategoryKeywordAction} className="flex flex-wrap gap-2">
          <input
            name="keyword"
            required
            placeholder="ej. netflix"
            className={`${field} flex-1`}
          />
          <select
            name="category_id"
            required
            className={fieldCompact}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Button>Agregar</Button>
        </form>
      </section>

      <section className={section}>
        <h3 className="font-semibold text-base tracking-tight">Gastos fijos</h3>
        <form action={addFixedExpenseAction} className="grid gap-2 sm:grid-cols-2">
          <input
            name="name"
            required
            placeholder="Nombre (ej. Alquiler)"
            className={field}
          />
          <input
            name="amount"
            type="number"
            step="0.01"
            required
            placeholder="Monto"
            className={field}
          />
          <select
            name="frequency"
            className={field}
          >
            <option value="monthly">Mensual</option>
            <option value="bimonthly">Bimestral</option>
            <option value="quarterly">Trimestral</option>
            <option value="annual">Anual</option>
          </select>
          <select
            name="account_id"
            className={field}
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
            className={`${field} sm:col-span-2`}
          >
            <option value="">Sin categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Button className="sm:col-span-2">Agregar gasto fijo</Button>
        </form>
      </section>
    </div>
  );
}
