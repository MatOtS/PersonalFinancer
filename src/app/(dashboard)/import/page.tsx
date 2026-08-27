import { createClient } from "@/lib/supabase/server";
import { getAccounts, getCategoriesWithSubcategories, getCategoryKeywords } from "@/lib/queries/catalog";
import { ImportWizard } from "./import-wizard";

export default async function ImportPage() {
  const supabase = await createClient();
  const [accounts, categories, keywords, profilesRes] = await Promise.all([
    getAccounts(supabase),
    getCategoriesWithSubcategories(supabase),
    getCategoryKeywords(supabase),
    supabase.from("csv_import_profiles").select("bank_name, column_mapping"),
  ]);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Importar movimientos (CSV)</h2>
      <ImportWizard
        accounts={accounts}
        categories={categories}
        keywords={keywords}
        profiles={profilesRes.data ?? []}
      />
    </div>
  );
}
