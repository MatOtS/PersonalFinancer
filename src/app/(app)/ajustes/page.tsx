import { listAccounts } from "@/data/accounts";
import { listCategories } from "@/data/categories";
import { AccountsSection } from "./accounts-section";
import { CategoriesSection } from "./categories-section";

// The session is checked before this runs: first by the proxy, then by the
// layout of `(app)`.
export default async function SettingsPage() {
  const [accounts, categories] = await Promise.all([
    listAccounts(),
    listCategories(),
  ]);

  return (
    <>
      <h1 className="text-h1 font-bold">Ajustes</h1>
      <AccountsSection accounts={accounts} />
      <CategoriesSection groups={categories} />
    </>
  );
}
