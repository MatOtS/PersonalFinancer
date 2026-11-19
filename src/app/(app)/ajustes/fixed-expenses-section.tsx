import type { Account } from "@/data/accounts";
import type { CategoryGroups } from "@/data/categories";
import type { FixedExpense } from "@/data/fixed-expenses";
import { frequencyLabel } from "@/domain/fixed-expenses";
import { formatCents } from "@/domain/money";
import { AddFixedExpenseForm } from "./add-fixed-expense-form";

type Props = {
  fixedExpenses: FixedExpense[];
  accounts: Account[];
  categories: CategoryGroups;
};

export const FixedExpensesSection = ({
  fixedExpenses,
  accounts,
  categories,
}: Props) => {
  return (
    <section
      id="gastos-fijos"
      aria-labelledby="gastos-fijos-title"
      className="mt-6 rounded-lg border border-border bg-surface p-6 shadow-card"
    >
      <h2 id="gastos-fijos-title" className="text-h2 font-semibold">
        Gastos fijos
      </h2>
      <AddFixedExpenseForm accounts={accounts} categories={categories} />
      {fixedExpenses.length === 0 ? (
        <p className="mt-6 text-small text-text-muted">
          Sin gastos fijos configurados
        </p>
      ) : (
        <ul className="mt-6">
          {fixedExpenses.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 border-b border-border py-3 last:border-b-0"
            >
              <span className="font-semibold">{item.name}</span>
              <span className="text-small text-text-muted">
                {frequencyLabel(item.frequency)}
              </span>
              <span className="ml-auto tabular-nums">
                {formatCents(item.amountCents)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
