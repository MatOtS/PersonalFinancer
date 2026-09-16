import { createClient } from "@/lib/supabase/server";
import { getAccounts, getCategoriesWithSubcategories } from "@/lib/queries/catalog";
import { QuickAddForm } from "./quick-add-form";
import { DashboardHeading } from "@/components/dashboard-layout";

export default async function QuickAddPage() {
  const supabase = await createClient();
  const [accounts, categories] = await Promise.all([
    getAccounts(supabase),
    getCategoriesWithSubcategories(supabase),
  ]);

  return (
    <div className="mx-auto max-w-md space-y-6">
      <DashboardHeading
        eyebrow="Registrar"
        subtitle="Un gasto o un ingreso, en pocos campos."
        title="Registro rápido"
      />
      <QuickAddForm accounts={accounts} categories={categories} />
    </div>
  );
}
