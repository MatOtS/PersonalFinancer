"use client";

import { UploadSimpleIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useRef, useState } from "react";
import {
  createImportAccountAction,
  findSavedMovementsAction,
  importMovementsAction,
} from "@/app/(app)/importar/actions";
import { BulkEditBar } from "@/components/movements/bulk-edit-bar";
import {
  MovementsTable,
  type MovementTableRow,
} from "@/components/movements/movements-table";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import type { Account } from "@/data/accounts";
import type { BankProfiles } from "@/data/bank-profiles";
import type { CategoryGroups } from "@/data/categories";
import type { KeywordRecord } from "@/data/keywords";
import { applyPatch, type RowPatch } from "@/domain/bulk-edit";
import { matchCategory } from "@/domain/categorize";
import { MISSING_ACCOUNT } from "@/domain/movements";
import {
  buildRows,
  duplicateKeys,
  foreignCurrenciesOf,
  MAX_ROWS_PER_CALL,
} from "@/domain/statement/build";
import {
  NO_COLUMN,
  proposeMapping,
  type Mapping,
} from "@/domain/statement/columns";
import {
  otherDirectionText,
  parseRate,
  type Rate,
  type RateDirection,
} from "@/domain/statement/rate";
import type { TableData } from "@/domain/statement/table";
import { ACCEPTED_EXTENSIONS, parseSpreadsheet } from "@/lib/import";

type Props = {
  accounts: Account[];
  categories: CategoryGroups;
  profiles: BankProfiles;
  keywords: KeywordRecord[];
};

type RateInput = { direction: RateDirection; text: string };

// A movement about to be imported: the data of a movement, whether it is left
// out of the import, and where it comes from.
type ImportRow = MovementTableRow & { excluded: boolean; duplicate: boolean };

const WORK_KINDS = [
  { value: "personal", label: "Personal" },
  { value: "freelance", label: "Freelance" },
];
const DIRECTIONS = [
  { value: "euroPerUnit", label: "Euros por unidad" },
  { value: "unitPerEuro", label: "Unidades por euro" },
];
const FIELD_LABELS: Record<keyof Mapping, string> = {
  date: "Fecha",
  description: "Descripción",
  amount: "Importe",
  sign: "Entrada o salida (opcional)",
};
const NO_SIGN = "__no_sign";

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

export const ImportWizard = ({
  accounts: initialAccounts,
  categories,
  profiles,
  keywords,
}: Props) => {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [accountId, setAccountId] = useState("");
  const [newAccount, setNewAccount] = useState("");
  const [newAccountError, setNewAccountError] = useState<string | null>(null);
  const [workKind, setWorkKind] = useState("");
  const [isFixed, setIsFixed] = useState(false);

  const [fileName, setFileName] = useState("");
  const [table, setTable] = useState<TableData | null>(null);
  const [mapping, setMapping] = useState<Mapping | null>(null);
  const [rates, setRates] = useState<Record<string, RateInput>>({});

  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [notes, setNotes] = useState<string[]>([]);
  const [errors, setErrors] = useState<{
    account?: string;
    workKind?: true;
    rates: Record<string, string>;
  }>({ rates: {} });
  const [message, setMessage] = useState<string | null>(null);
  // The dates of what was just imported, to open the Home on them (its period
  // is the last month, and a statement can be older).
  const [importedRange, setImportedRange] = useState<{
    from: string;
    to: string;
  } | null>(null);
  // Changing the key empties the file field, so the same file can be chosen again.
  const [fileKey, setFileKey] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const foreign = table ? foreignCurrenciesOf(table) : [];

  const reset = () => {
    setFileName("");
    setTable(null);
    setMapping(null);
    setRates({});
    setRows(null);
    setSelected(new Set());
    setNotes([]);
    setErrors({ rates: {} });
    setFileKey((key) => key + 1);
  };

  const chooseAccount = (id: string | null) => {
    const next = id ?? "";
    setAccountId(next);
    // The columns remembered for this account, if a file is already chosen.
    if (table) setMapping(proposeMapping(table, profiles[next]));
    setRows(null);
  };

  const addAccount = async () => {
    setNewAccountError(null);
    const result = await createImportAccountAction(newAccount);
    if (!result.ok) {
      setNewAccountError(result.error);
      return;
    }
    setAccounts((current) => [...current, result.account]);
    setNewAccount("");
    chooseAccount(result.account.id);
  };

  const chooseFile = async (file: File) => {
    setError(null);
    setMessage(null);
    setImportedRange(null);
    setRows(null);
    setFileName(file.name);
    try {
      const parsed = await parseSpreadsheet(file);
      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        setTable(null);
        setMapping(null);
        setError("No se encontraron movimientos en el archivo.");
        return;
      }
      setTable(parsed);
      setMapping(proposeMapping(parsed, profiles[accountId]));
      setRates({});
    } catch (cause) {
      setTable(null);
      setMapping(null);
      setError(
        cause instanceof Error ? cause.message : "No se pudo leer el archivo.",
      );
    }
  };

  const preview = async () => {
    if (!table || !mapping) return;
    setError(null);
    setMessage(null);

    // What the user still has to give: the account, personal or freelance and
    // the rate of every other currency.
    const next: typeof errors = { rates: {} };
    if (accountId === "") next.account = MISSING_ACCOUNT;
    if (workKind === "") next.workKind = true;
    const parsedRates: Record<string, Rate> = {};
    for (const currency of foreign) {
      const input = rates[currency] ?? { direction: "euroPerUnit", text: "" };
      const parsed = parseRate(input.text, input.direction);
      if ("error" in parsed) next.rates[currency] = parsed.error;
      else parsedRates[currency] = parsed.rate;
    }
    setErrors(next);
    if (next.account || next.workKind || Object.keys(next.rates).length > 0)
      return;
    if (!mapping.date || !mapping.description || !mapping.amount) {
      setError("Elige las columnas de fecha, descripción e importe.");
      return;
    }

    setBusy(true);
    try {
      const built = buildRows(table, mapping, parsedRates);
      const dates = built.rows.map((row) => row.date).sort();
      const saved =
        dates.length > 0
          ? await findSavedMovementsAction({
              from: dates[0] ?? "",
              to: dates[dates.length - 1] ?? "",
            })
          : [];
      const duplicates = duplicateKeys(built.rows, saved);

      setRows(
        built.rows.map((row) => ({
          key: row.key,
          date: row.date,
          description: row.description,
          amountCents: row.amountCents,
          kind: row.kind,
          accountId,
          categoryId: matchCategory(row.description, keywords),
          subcategoryId: null,
          workKind: workKind === "freelance" ? "freelance" : "personal",
          isFixed,
          excluded: duplicates.has(row.key),
          duplicate: duplicates.has(row.key),
        })),
      );
      setSelected(new Set());

      const left: string[] = [];
      if (built.withoutDate > 0) {
        left.push(
          `Se descartaron ${built.withoutDate} filas sin fecha válida.`,
        );
      }
      if (built.withoutAmount > 0) {
        left.push(
          `Se descartaron ${built.withoutAmount} filas sin importe válido.`,
        );
      }
      setNotes(left);
      if (built.rows.length === 0) {
        setError(
          "Ninguna fila quedó utilizable: revisa que las columnas de fecha e importe sean las correctas.",
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const setExcluded = (excluded: boolean) =>
    setRows((current) =>
      (current ?? []).map((row) =>
        selected.has(row.key) ? { ...row, excluded } : row,
      ),
    );

  const applyToSelected = (patch: RowPatch) => {
    setRows((current) =>
      (current ?? []).map((row) =>
        selected.has(row.key) ? { ...row, ...applyPatch(row, patch) } : row,
      ),
    );
    return null;
  };

  const confirm = async () => {
    if (!rows || !mapping) return;
    const toImport = rows.filter((row) => !row.excluded);
    setBusy(true);
    setError(null);
    let imported = 0;
    for (let start = 0; start < toImport.length; start += MAX_ROWS_PER_CALL) {
      const result = await importMovementsAction(
        toImport.slice(start, start + MAX_ROWS_PER_CALL).map((row) => ({
          date: row.date,
          description: row.description,
          amountCents: row.amountCents,
          kind: row.kind,
          accountId: row.accountId,
          categoryId: row.categoryId,
          subcategoryId: row.subcategoryId,
          workKind: row.workKind,
          isFixed: row.isFixed,
        })),
        start === 0 ? { accountId, mapping } : null,
      );
      if (!result.ok) {
        setError(
          imported > 0
            ? `${result.error}. Se importaron ${imported} de ${toImport.length} movimientos antes del error.`
            : result.error,
        );
        setBusy(false);
        return;
      }
      imported += result.imported;
    }
    setBusy(false);
    const dates = toImport.map((row) => row.date).sort();
    reset();
    setImportedRange({
      from: dates[0] ?? "",
      to: dates[dates.length - 1] ?? "",
    });
    setMessage(`Se importaron ${imported} movimientos.`);
  };

  const tableRows: MovementTableRow[] = (rows ?? []).map((row) => ({
    ...row,
    muted: row.excluded,
    note: row.duplicate
      ? row.excluded
        ? "Posible duplicado: fuera de la importación"
        : "Posible duplicado"
      : row.excluded
        ? "Fuera de la importación"
        : undefined,
  }));
  const included = (rows ?? []).filter((row) => !row.excluded).length;
  const duplicates = (rows ?? []).filter((row) => row.duplicate).length;

  return (
    <div className="mt-6 flex flex-col gap-6">
      <section
        aria-label="Extracto"
        className="rounded-lg border border-border bg-surface p-6 shadow-card"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-3">
            <SelectField
              label="Cuenta"
              name="importAccount"
              options={accounts.map((a) => ({ value: a.id, label: a.name }))}
              value={accountId || null}
              onValueChange={chooseAccount}
              placeholder="Elige una cuenta"
              error={errors.account}
            />
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <TextField
                  label="Nueva cuenta"
                  autoComplete="off"
                  value={newAccount}
                  onChange={(event) => setNewAccount(event.target.value)}
                  error={newAccountError ?? undefined}
                />
              </div>
              <div className="pt-[26px]">
                <Button variant="secondary" onClick={addAccount}>
                  Añadir cuenta
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <SegmentedControl
              name="importWorkKind"
              label="Personal o freelance"
              visibleLabel
              options={WORK_KINDS}
              value={workKind}
              onChange={setWorkKind}
              invalid={errors.workKind}
            />
            <label className="flex items-center gap-2 text-small font-semibold">
              <input
                type="checkbox"
                checked={isFixed}
                onChange={(event) => setIsFixed(event.target.checked)}
              />
              Movimientos fijos
            </label>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-1.5">
          <span id="statement-file-label" className="text-small font-semibold">
            Archivo del banco
          </span>
          {/* The real field is hidden: only the button below opens it. */}
          <input
            key={fileKey}
            ref={fileInput}
            id="statement-file"
            type="file"
            className="sr-only"
            tabIndex={-1}
            aria-labelledby="statement-file-label"
            accept={ACCEPTED_EXTENSIONS}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void chooseFile(file);
            }}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              aria-describedby="statement-file-label"
              onClick={() => fileInput.current?.click()}
            >
              <UploadSimpleIcon size={16} aria-hidden="true" />
              {fileName ? "Cambiar archivo" : "Elegir archivo"}
            </Button>
            <span className="text-small text-text-muted">
              {fileName || "Ningún archivo elegido (.csv, .xlsx o .xls)"}
            </span>
          </div>
        </div>
      </section>

      {error && (
        <p role="alert" className="text-small text-negative">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-body font-semibold">
          {message}
          {importedRange && (
            <>
              {" "}
              <Link
                href={`/?from=${importedRange.from}&to=${importedRange.to}`}
                className="text-accent underline"
              >
                Ver en Inicio (
                {importedRange.from.split("-").reverse().join("/")}
                {" a "}
                {importedRange.to.split("-").reverse().join("/")})
              </Link>
            </>
          )}
        </p>
      )}

      {table && mapping && (
        <section
          aria-label="Columnas"
          className="rounded-lg border border-border bg-surface p-6 shadow-card"
        >
          <h2 className="text-h2 font-semibold">Columnas del archivo</h2>
          <p className="mt-1 text-small text-text-muted">
            {fileName} · {plural(table.rows.length, "fila", "filas")}. Comprueba
            que cada columna sea la correcta.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {(Object.keys(FIELD_LABELS) as (keyof Mapping)[]).map((field) => (
              <SelectField
                key={field}
                label={FIELD_LABELS[field]}
                name={`map-${field}`}
                options={[
                  ...(field === "sign"
                    ? [{ value: NO_SIGN, label: "El importe ya trae el signo" }]
                    : []),
                  ...table.headers.map((header) => ({
                    value: header,
                    label: header,
                  })),
                ]}
                value={
                  mapping[field] === NO_COLUMN
                    ? field === "sign"
                      ? NO_SIGN
                      : null
                    : mapping[field]
                }
                onValueChange={(value) => {
                  setMapping({
                    ...mapping,
                    [field]:
                      value === NO_SIGN || value === null ? NO_COLUMN : value,
                  });
                  setRows(null);
                }}
                placeholder="Elige una columna"
              />
            ))}
          </div>

          {foreign.length > 0 && (
            <div className="mt-6 flex flex-col gap-3">
              <p className="text-small">
                El archivo trae importes en {foreign.join(", ")}. La app guarda
                euros: escribe el tipo de cambio para convertirlos.
              </p>
              {foreign.map((currency) => {
                const input = rates[currency] ?? {
                  direction: "euroPerUnit" as RateDirection,
                  text: "",
                };
                const parsed = parseRate(input.text, input.direction);
                return (
                  <div
                    key={currency}
                    className="flex flex-wrap items-start gap-3"
                  >
                    <div className="w-48">
                      <SelectField
                        label={`Sentido (${currency})`}
                        name={`direction-${currency}`}
                        options={DIRECTIONS}
                        value={input.direction}
                        onValueChange={(value) =>
                          setRates({
                            ...rates,
                            [currency]: {
                              ...input,
                              direction:
                                value === "unitPerEuro"
                                  ? "unitPerEuro"
                                  : "euroPerUnit",
                            },
                          })
                        }
                        placeholder="Sentido"
                      />
                    </div>
                    <div className="w-40">
                      <TextField
                        label={`Tipo de cambio ${currency}`}
                        inputMode="decimal"
                        autoComplete="off"
                        alignRight
                        value={input.text}
                        onChange={(event) =>
                          setRates({
                            ...rates,
                            [currency]: { ...input, text: event.target.value },
                          })
                        }
                        error={errors.rates[currency]}
                      />
                    </div>
                    {"rate" in parsed && (
                      <p className="pt-[34px] text-small text-text-muted">
                        {input.direction === "euroPerUnit"
                          ? `1 ${currency} = ${input.text} €  ·  1 € = ${otherDirectionText(parsed.rate)} ${currency}`
                          : `1 € = ${input.text} ${currency}  ·  1 ${currency} = ${otherDirectionText(parsed.rate)} €`}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-6">
            <Button variant="primary" disabled={busy} onClick={preview}>
              Previsualizar
            </Button>
          </div>
        </section>
      )}

      {rows && rows.length > 0 && (
        <section
          aria-label="Movimientos por importar"
          className="rounded-lg border border-border bg-surface p-6 shadow-card"
        >
          <h2 className="text-h2 font-semibold">Movimientos por importar</h2>
          <p className="mt-1 text-small text-text-muted">
            {plural(rows.length, "movimiento", "movimientos")} ·{" "}
            {plural(duplicates, "posible duplicado", "posibles duplicados")}{" "}
            (fuera de la importación por defecto).
          </p>
          {notes.map((note) => (
            <p key={note} role="status" className="mt-1 text-small">
              {note}
            </p>
          ))}

          <div className="mt-4">
            <BulkEditBar
              count={selected.size}
              accounts={accounts}
              categories={categories}
              onApply={applyToSelected}
            />
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              variant="secondary"
              disabled={selected.size === 0}
              onClick={() => setExcluded(true)}
            >
              Dejar fuera las seleccionadas
            </Button>
            <Button
              variant="secondary"
              disabled={selected.size === 0}
              onClick={() => setExcluded(false)}
            >
              Incluir las seleccionadas
            </Button>
          </div>

          <div className="mt-4">
            <MovementsTable
              rows={tableRows}
              accounts={accounts}
              categories={categories}
              selected={selected}
              onSelectedChange={setSelected}
              caption="Movimientos por importar"
              emptyText="Sin movimientos"
            />
          </div>

          <div className="mt-4">
            <Button
              variant="primary"
              disabled={busy || included === 0}
              onClick={confirm}
            >
              {busy
                ? "Importando..."
                : `Importar ${plural(included, "movimiento", "movimientos")}`}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
};
