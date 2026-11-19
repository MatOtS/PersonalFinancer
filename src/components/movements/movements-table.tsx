"use client";

import { useEffect, useRef } from "react";
import type { Account } from "@/data/accounts";
import type { CategoryGroups } from "@/data/categories";
import type { PatchableRow } from "@/domain/bulk-edit";
import { formatCents } from "@/domain/money";

// A row of the table: the data of a movement and a key that tells it apart
// (the id of a saved movement, or the position of a row about to be imported).
export type MovementTableRow = PatchableRow & {
  key: string;
  // Shown dimmed (a possible duplicate).
  muted?: boolean;
  // A short text under the description (why it is dimmed, for instance).
  note?: string;
};

type Props = {
  rows: MovementTableRow[];
  accounts: Account[];
  categories: CategoryGroups;
  selected: ReadonlySet<string>;
  onSelectedChange: (selected: Set<string>) => void;
  // What goes in the last column of a row (edit and delete buttons...).
  renderActions?: (row: MovementTableRow) => React.ReactNode;
  caption: string;
  emptyText: string;
};

const formatDate = (iso: string) => iso.split("-").reverse().join("/");

// The list of movements with a box at the left of each row, and one in the
// header that selects them all, as in a file explorer. It does not decide what
// is done with the selection: the one who uses it does (edit, delete...).
export const MovementsTable = ({
  rows,
  accounts,
  categories,
  selected,
  onSelectedChange,
  renderActions,
  caption,
  emptyText,
}: Props) => {
  const accountName = new Map(accounts.map((a) => [a.id, a.name]));
  const categoryName = new Map<string, string>();
  for (const category of [...categories.expense, ...categories.income]) {
    categoryName.set(category.id, category.name);
    for (const sub of category.subcategories)
      categoryName.set(sub.id, sub.name);
  }

  const all = rows.length > 0 && rows.every((row) => selected.has(row.key));
  const some = rows.some((row) => selected.has(row.key));
  const headerBox = useRef<HTMLInputElement>(null);
  useEffect(() => {
    // A box that is neither on nor off while only some rows are selected.
    if (headerBox.current) headerBox.current.indeterminate = some && !all;
  }, [some, all]);

  if (rows.length === 0) {
    return <p className="text-small text-text-muted">{emptyText}</p>;
  }

  const toggle = (key: string, on: boolean) => {
    const next = new Set(selected);
    if (on) next.add(key);
    else next.delete(key);
    onSelectedChange(next);
  };

  return (
    <div className="max-h-[32rem] overflow-auto rounded-md border border-border">
      <table className="w-full text-left text-small">
        <caption className="sr-only">{caption}</caption>
        <thead className="sticky top-0 bg-surface">
          <tr className="border-b border-border text-text-muted">
            <th scope="col" className="w-10 py-2 pl-3">
              <input
                ref={headerBox}
                type="checkbox"
                aria-label="Seleccionar todos"
                checked={all}
                onChange={(event) =>
                  onSelectedChange(
                    event.target.checked
                      ? new Set(rows.map((row) => row.key))
                      : new Set(),
                  )
                }
              />
            </th>
            <th scope="col" className="py-2 pr-3 font-semibold">
              Fecha
            </th>
            <th scope="col" className="py-2 pr-3 font-semibold">
              Descripción
            </th>
            <th scope="col" className="py-2 pr-3 font-semibold">
              Cuenta
            </th>
            <th scope="col" className="py-2 pr-3 font-semibold">
              Categoría
            </th>
            <th scope="col" className="py-2 pr-3 font-semibold">
              Tipo
            </th>
            <th scope="col" className="py-2 pr-3 text-right font-semibold">
              Importe
            </th>
            {renderActions && (
              <th scope="col" className="py-2 pr-3 font-semibold">
                Acciones
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const category = row.categoryId
              ? categoryName.get(row.categoryId)
              : null;
            const sub = row.subcategoryId
              ? categoryName.get(row.subcategoryId)
              : null;
            const description = row.description ?? "(sin descripción)";
            return (
              <tr
                key={row.key}
                className={`border-b border-border last:border-b-0 ${row.muted ? "opacity-60" : ""}`}
              >
                <td className="py-2 pl-3">
                  <input
                    type="checkbox"
                    aria-label={`Seleccionar ${description}`}
                    checked={selected.has(row.key)}
                    onChange={(event) => toggle(row.key, event.target.checked)}
                  />
                </td>
                <td className="whitespace-nowrap py-2 pr-3 tabular-nums">
                  {formatDate(row.date)}
                </td>
                <td className="max-w-72 py-2 pr-3">
                  <span className="block truncate">{description}</span>
                  {row.note && (
                    <span className="block text-text-muted">{row.note}</span>
                  )}
                </td>
                <td className="whitespace-nowrap py-2 pr-3">
                  {accountName.get(row.accountId) ?? "—"}
                </td>
                <td className="whitespace-nowrap py-2 pr-3 text-text-muted">
                  {category ? (sub ? `${category} / ${sub}` : category) : "—"}
                </td>
                <td className="whitespace-nowrap py-2 pr-3 text-text-muted">
                  {row.workKind === "freelance" ? "Freelance" : "Personal"}
                  {row.isFixed ? " · fijo" : ""}
                </td>
                <td
                  className={`whitespace-nowrap py-2 pr-3 text-right tabular-nums ${
                    row.kind === "income" ? "text-positive" : ""
                  }`}
                >
                  {row.kind === "expense" ? "-" : ""}
                  {formatCents(row.amountCents)}
                  <span className="sr-only">
                    {row.kind === "expense" ? " (gasto)" : " (ingreso)"}
                  </span>
                </td>
                {renderActions && (
                  <td className="py-2 pr-3">{renderActions(row)}</td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
