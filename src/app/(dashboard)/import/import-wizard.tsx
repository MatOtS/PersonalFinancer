"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ACCEPTED_EXTENSIONS, parseSpreadsheet, type TableData } from "@/lib/import";
import { parseAmount, parseDate, parseSign, foreignCurrencies } from "@/lib/import/values";
import { matchCategory } from "@/lib/import/categorize";
import { formatCurrency, formatDate } from "@/lib/format";
import type { MovementType } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";

interface Category {
  id: string;
  name: string;
  subcategories: { id: string; name: string }[];
}

interface Mapping {
  date: string;
  description: string;
  amount: string;
  /** Optional: a column that carries the direction instead of a signed amount. */
  sign: string;
}

interface Props {
  accounts: { id: string; name: string }[];
  categories: Category[];
  keywords: { keyword: string; category_id: string; subcategory_id: string | null }[];
  profiles: { bank_name: string; column_mapping: Partial<Mapping> }[];
}

interface PreviewRow {
  date: string;
  description: string;
  amount: number;
  category_id: string | null;
  subcategory_id: string | null;
  duplicate: boolean;
  include: boolean;
}

const NO_COLUMN = "";

const HEADER_GUESSES = {
  date: ["fecha de operación", "fecha operacion", "fecha", "creada el", "date", "f. valor", "f.valor"],
  description: ["concepto", "descripcion", "descripción", "detalle", "referencia", "description", "nota"],
  amount: ["importe", "cantidad de origen", "cantidad", "monto", "amount"],
  sign: ["dirección", "direccion", "tipo de movimiento", "debe/haber"],
};

/**
 * Columns that read like an amount but are not the movement's amount. Wise puts
 * a fee column first and it matched on the word "importe"; a running balance
 * matches just as well and would import every row as the account total.
 */
const NOT_AN_AMOUNT = [
  "comisión de",
  "comision de",
  "fee",
  "saldo",
  "balance",
  "disponible",
  "tipo de cambio",
];

const isNumeric = (value: string) =>
  /^[-+(]?[\d.,\s]+\)?-?$/.test(value) && parseAmount(value) !== 0;

const isDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(parseDate(value));

/** Share of the non-empty cells in a column that pass a test. */
function columnScore(rows: Record<string, string>[], header: string, test: (v: string) => boolean) {
  const values = rows.map((r) => (r[header] ?? "").trim()).filter((v) => v !== "");
  if (values.length === 0) return 0;
  return values.filter(test).length / values.length;
}

/**
 * Picks a column by name, but only if its contents back the name up: the header
 * words give the order of preference and the test is what actually decides.
 */
function guessColumn(
  table: TableData,
  candidates: string[],
  test: (v: string) => boolean,
  exclude: string[] = []
) {
  const allowed = table.headers.filter(
    (h) => !exclude.some((word) => h.toLowerCase().includes(word))
  );

  for (const candidate of candidates) {
    const named = allowed.filter((h) => h.toLowerCase().includes(candidate));
    const usable = named.find((h) => columnScore(table.rows, h, test) >= 0.6);
    if (usable) return usable;
  }

  // Nothing matched by name: fall back to any column that clearly holds this
  // kind of value, then to the first column with a matching name.
  const byContent = allowed.find((h) => columnScore(table.rows, h, test) >= 0.8);
  if (byContent) return byContent;

  for (const candidate of candidates) {
    const named = allowed.find((h) => h.toLowerCase().includes(candidate));
    if (named) return named;
  }

  // Never leave a required field unset: a select whose value matches no option
  // shows the first one, and the user would be looking at a column the import
  // is not actually using.
  return allowed[0] ?? table.headers[0] ?? NO_COLUMN;
}

const FIELD_LABELS: Record<keyof Mapping, string> = {
  date: "Fecha",
  description: "Descripción",
  amount: "Importe",
  sign: "Entrada/Salida (opcional)",
};

function guessTextColumn(headers: string[], candidates: string[], fallbackToFirst = true) {
  for (const candidate of candidates) {
    const match = headers.find((h) => h.toLowerCase().includes(candidate));
    if (match) return match;
  }
  return fallbackToFirst ? headers[0] ?? NO_COLUMN : NO_COLUMN;
}

const selectClass = "w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm";

export function ImportWizard({ accounts, categories, keywords, profiles }: Props) {
  const router = useRouter();

  const [bankName, setBankName] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [type, setType] = useState<MovementType>("personal");
  const [table, setTable] = useState<TableData | null>(null);
  const [fileName, setFileName] = useState("");
  const [mapping, setMapping] = useState<Mapping>({
    date: "",
    description: "",
    amount: "",
    sign: NO_COLUMN,
  });
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const existingProfile = useMemo(
    () => profiles.find((p) => p.bank_name.toLowerCase() === bankName.trim().toLowerCase()),
    [profiles, bankName]
  );

  const currencies = useMemo(
    () => (table ? foreignCurrencies(table.rows, table.headers) : []),
    [table]
  );

  async function handleFile(file: File) {
    setError(null);
    setMessage(null);
    setPreview(null);
    setFileName(file.name);

    try {
      const parsed = await parseSpreadsheet(file);
      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        setTable(null);
        setError("No se encontraron movimientos en el archivo.");
        return;
      }

      setTable(parsed);
      const saved = existingProfile?.column_mapping;
      const usable = (column: string | undefined) =>
        column && parsed.headers.includes(column) ? column : null;

      setMapping({
        date: usable(saved?.date) ?? guessColumn(parsed, HEADER_GUESSES.date, isDate),
        description:
          usable(saved?.description) ??
          guessTextColumn(parsed.headers, HEADER_GUESSES.description),
        amount:
          usable(saved?.amount) ??
          guessColumn(parsed, HEADER_GUESSES.amount, isNumeric, NOT_AN_AMOUNT),
        sign:
          usable(saved?.sign) ?? guessTextColumn(parsed.headers, HEADER_GUESSES.sign, false),
      });
    } catch (cause) {
      setTable(null);
      setError(cause instanceof Error ? cause.message : "No se pudo leer el archivo.");
    }
  }

  async function buildPreview() {
    if (!table) return;
    setLoading(true);
    setError(null);
    setMessage(null);

    const rows = table.rows.map((r) => {
      const magnitude = parseAmount(r[mapping.amount] ?? "0");
      const sign = mapping.sign ? parseSign(r[mapping.sign] ?? "") : 0;
      return {
        date: parseDate(r[mapping.date] ?? ""),
        // A movement with no concept still moved money: keep it, labelled.
        description: (r[mapping.description] ?? "").trim() || "(sin concepto)",
        amount: sign === 0 ? magnitude : Math.abs(magnitude) * sign,
      };
    });

    const dates = rows.map((r) => r.date).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
    const from = dates[0];
    const to = dates[dates.length - 1];

    const { data: existing } = from
      ? await createClient()
          .from("movements")
          .select("date, description, amount")
          .gte("date", from)
          .lte("date", to)
      : { data: [] };

    const existingKeys = new Set((existing ?? []).map((m) => `${m.date}|${m.description}|${m.amount}`));

    const built: PreviewRow[] = rows
      .filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.date) && r.amount !== 0)
      .map((r) => {
        const duplicate = existingKeys.has(`${r.date}|${r.description}|${r.amount}`);
        const match = matchCategory(r.description, keywords);
        return {
          ...r,
          category_id: match?.category_id ?? null,
          subcategory_id: match?.subcategory_id ?? null,
          duplicate,
          include: !duplicate,
        };
      });

    const skipped = rows.length - built.length;
    setPreview(built);
    if (built.length === 0) {
      setError(
        "Ninguna fila quedó utilizable: revisá que las columnas de fecha e importe sean las correctas."
      );
    } else if (skipped > 0) {
      setMessage(`Se descartaron ${skipped} filas sin fecha válida o con importe 0.`);
    }
    setLoading(false);
  }

  function updateRow(index: number, patch: Partial<PreviewRow>) {
    setPreview((prev) => prev?.map((row, i) => (i === index ? { ...row, ...patch } : row)) ?? null);
  }

  async function confirmImport() {
    if (!preview) return;
    setLoading(true);
    setError(null);
    setMessage(null);

    const rowsToInsert = preview
      .filter((r) => r.include)
      .map((r) => ({
        date: r.date,
        description: r.description,
        amount: r.amount,
        account_id: accountId,
        category_id: r.category_id,
        subcategory_id: r.subcategory_id,
        type,
        source: "csv_import" as const,
      }));

    if (rowsToInsert.length > 0) {
      const { error: insertError } = await createClient().from("movements").insert(rowsToInsert);
      if (insertError) {
        setError(`Error al importar: ${insertError.message}`);
        setLoading(false);
        return;
      }
    }

    if (bankName.trim()) {
      await createClient()
        .from("csv_import_profiles")
        .upsert({ bank_name: bankName.trim(), column_mapping: mapping }, { onConflict: "user_id,bank_name" });
    }

    setLoading(false);
    setMessage(`Se importaron ${rowsToInsert.length} movimientos.`);
    setPreview(null);
    setTable(null);
    setFileName("");
    router.refresh();
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="bank">
            Banco
          </label>
          <input
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            id="bank"
            list="bank-profiles"
            onChange={(e) => setBankName(e.target.value)}
            placeholder="BBVA, Santander, Wise, MyInvestor..."
            value={bankName}
          />
          <datalist id="bank-profiles">
            {profiles.map((p) => (
              <option key={p.bank_name} value={p.bank_name} />
            ))}
          </datalist>
          <p className="text-muted-foreground text-xs">
            Se recuerda qué columna es cada cosa para la próxima vez.
          </p>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="account">
            Cuenta destino
          </label>
          <select
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            id="account"
            onChange={(e) => setAccountId(e.target.value)}
            value={accountId}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="movement-type">
            Tipo
          </label>
          <select
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            id="movement-type"
            onChange={(e) => setType(e.target.value as MovementType)}
            value={type}
          >
            <option value="personal">Personal</option>
            <option value="freelance">Freelance</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="file">
            Archivo del banco
          </label>
          <input
            accept={ACCEPTED_EXTENSIONS}
            className="w-full text-sm"
            id="file"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            type="file"
          />
          <p className="text-muted-foreground text-xs">
            Excel (.xlsx, .xls) o CSV. El archivo se lee en tu navegador y no se sube a ningún lado.
          </p>
        </div>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">{error}</p>
      )}

      {table && (
        <div className="space-y-3 rounded-lg border border-border p-4">
          <div>
            <p className="font-medium text-sm">
              {fileName} · {table.rows.length} filas
            </p>
            <p className="text-muted-foreground text-xs">
              Comprobá que cada columna del archivo esté asignada al campo correcto.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {(Object.keys(FIELD_LABELS) as (keyof Mapping)[]).map((field) => (
              <div className="space-y-1" key={field}>
                <label
                  className="font-medium text-muted-foreground text-xs uppercase"
                  htmlFor={`map-${field}`}
                >
                  {FIELD_LABELS[field]}
                </label>
                <select
                  className={selectClass}
                  id={`map-${field}`}
                  onChange={(e) => setMapping((m) => ({ ...m, [field]: e.target.value }))}
                  value={mapping[field]}
                >
                  {field === "sign" && <option value={NO_COLUMN}>El importe ya trae el signo</option>}
                  {table.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {mapping.sign && (
            <p className="text-muted-foreground text-xs">
              Los gastos se detectan por esa columna (OUT, salida, cargo, débito) y el importe se
              guarda en negativo.
            </p>
          )}

          {currencies.length > 0 && (
            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              El archivo trae importes en {currencies.join(", ")}. La app trabaja en euros: se
              importarán tal cual, sin convertir.
            </p>
          )}

          <Button
            disabled={loading || !mapping.date || !mapping.description || !mapping.amount}
            onClick={buildPreview}
          >
            Previsualizar
          </Button>
        </div>
      )}

      {preview && (
        <div className="space-y-3">
          <p className="text-muted-foreground text-sm">
            {preview.length} movimientos · {preview.filter((r) => r.duplicate).length} posibles
            duplicados (desmarcados por defecto).
          </p>
          <div className="max-h-96 overflow-y-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted text-left text-muted-foreground text-xs">
                <tr>
                  <th className="px-3 py-2">Incluir</th>
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Descripción</th>
                  <th className="px-3 py-2 text-right">Importe</th>
                  <th className="px-3 py-2">Categoría</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr className={`border-border border-t ${row.duplicate ? "opacity-50" : ""}`} key={i}>
                    <td className="px-3 py-1.5">
                      <input
                        aria-label={`Incluir ${row.description}`}
                        checked={row.include}
                        onChange={(e) => updateRow(i, { include: e.target.checked })}
                        type="checkbox"
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-1.5 tabular-nums">{formatDate(row.date)}</td>
                    <td className="max-w-80 truncate px-3 py-1.5">{row.description}</td>
                    <td
                      className={`whitespace-nowrap px-3 py-1.5 text-right tabular-nums ${
                        row.amount < 0 ? "" : "text-[var(--chart-income)]"
                      }`}
                    >
                      {formatCurrency(row.amount)}
                    </td>
                    <td className="px-3 py-1.5">
                      <select
                        aria-label={`Categoría de ${row.description}`}
                        className="rounded-md border border-input bg-transparent px-1 py-0.5 text-xs"
                        onChange={(e) =>
                          updateRow(i, { category_id: e.target.value || null, subcategory_id: null })
                        }
                        value={row.category_id ?? ""}
                      >
                        <option value="">Sin categorizar</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button disabled={loading} onClick={confirmImport}>
            {loading ? "Importando..." : `Importar ${preview.filter((r) => r.include).length} movimientos`}
          </Button>
        </div>
      )}

      {message && <p className="text-sm">{message}</p>}
    </div>
  );
}
