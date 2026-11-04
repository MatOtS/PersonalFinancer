import { listAccounts } from "@/data/accounts";
import { AccountsSection } from "./accounts-section";

// The session is checked before this runs: first by the proxy, then by the
// layout of `(app)`.
export default async function SettingsPage() {
  const accounts = await listAccounts();

  return (
    <>
      <h1 className="text-h1 font-bold">Ajustes</h1>
      <AccountsSection accounts={accounts} />
    </>
  );
}
