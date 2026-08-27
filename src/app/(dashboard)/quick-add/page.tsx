import { createClient } from "@/lib/supabase/server";
import { getAccounts, getCategoriesWithSubcategories } from "@/lib/queries/catalog";
import { QuickAddForm } from "./quick-add-form";

export default async function QuickAddPage() {
  const supabase = await createClient();
  const [accounts, categories] = await Promise.all([
    getAccounts(supabase),
    getCategoriesWithSubcategories(supabase),
  ]);

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h2 className="text-lg font-semibold">Registrar gasto rápido</h2>
      <QuickAddForm accounts={accounts} categories={categories} />
    </div>
  );
}
