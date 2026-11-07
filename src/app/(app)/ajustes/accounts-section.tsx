import type { Account } from "@/data/accounts";
import { AccountList } from "./account-list";
import { AddAccountForm } from "./add-account-form";

export const AccountsSection = ({ accounts }: { accounts: Account[] }) => {
  return (
    <section
      id="cuentas"
      aria-labelledby="cuentas-title"
      className="mt-6 rounded-lg border border-border bg-surface p-6 shadow-card"
    >
      <h2 id="cuentas-title" className="text-h2 font-semibold">
        Cuentas
      </h2>
      <AddAccountForm />
      <AccountList accounts={accounts} />
    </section>
  );
};
