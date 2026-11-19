import { listAccounts } from "@/data/accounts";
import { listCategories } from "@/data/categories";
import { listClients } from "@/data/clients";
import { listFixedExpenses } from "@/data/fixed-expenses";
import { listKeywords } from "@/data/keywords";
import { getSettings } from "@/data/invoices";
import { hasLogo } from "@/data/logo";
import { AccountsSection } from "./accounts-section";
import { BillingSection } from "./billing-section";
import { CategoriesSection } from "./categories-section";
import { ClientsSection } from "./clients-section";
import { FixedExpensesSection } from "./fixed-expenses-section";
import { KeywordsSection } from "./keywords-section";

// The session is checked before this runs: first by the proxy, then by the
// layout of `(app)`.
export default async function SettingsPage() {
  const [
    accounts,
    categories,
    keywords,
    fixedExpenses,
    clients,
    settings,
    logo,
  ] = await Promise.all([
    listAccounts(),
    listCategories(),
    listKeywords(),
    listFixedExpenses(),
    listClients(),
    getSettings(),
    hasLogo(),
  ]);

  return (
    <>
      <h1 className="text-h1 font-bold">Ajustes</h1>
      <AccountsSection accounts={accounts} />
      <CategoriesSection groups={categories} />
      <KeywordsSection keywords={keywords} categories={categories} />
      <FixedExpensesSection
        fixedExpenses={fixedExpenses}
        accounts={accounts}
        categories={categories}
      />
      <ClientsSection clients={clients} />
      <BillingSection settings={settings} hasLogo={logo} />
    </>
  );
}
