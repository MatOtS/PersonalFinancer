"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { parseCsvFile, parseAmount, parseDate, type ParsedCsv } from "@/lib/csv/parse";
import { matchCategory } from "@/lib/csv/categorize";
import { formatCurrency } from "@/lib/format";
import type { MovementType } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";

interface Category {
  id: string;
  name: string;
  subcategories: { id: string; name: string }[];
}

interface Props {
  accounts: { id: string; name: string }[];
  categories: Category[];
  keywords: { keyword: string; category_id: string; subcategory_id: string | null }[];
  profiles: { bank_name: string; column_mapping: { date: string; description: string; amount: string } }[];
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

const HEADER_GUESSES = {
  date: ["fecha", "date", "fecha valor", "fecha operacion", "f. valor"],
  description: ["descripcion", "descripción", "concepto", "description", "detalle"],
  amount: ["importe", "monto", "amount", "cantidad"],
};

function guessHeader(headers: string[], candidates: string[]) {
  return headers.find((h) => candidates.some((c) => h.toLowerCase().includes(c))) ?? headers[0] ?? "";
}

export function ImportWizard({ accounts, categories, keywords, profiles }: Props) {
  const router = useRouter();

  const [bankName, setBankName] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [type, setType] = useState<MovementType>("personal");
  const [csv, setCsv] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState({ date: "", description: "", amount: "" });
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const existingProfile = useMemo(
    () => profiles.find((p) => p.bank_name.toLowerCase() === bankName.trim().toLowerCase()),
    [profiles, bankName]
  );

  async function handleFile(file: File) {
    const parsed = await parseCsvFile(file);
    setCsv(parsed);
    setPreview(null);
    const initialMapping = existingProfile?.column_mapping ?? {
      date: guessHeader(parsed.headers, HEADER_GUESSES.date),
      description: guessHeader(parsed.headers, HEADER_GUESSES.description),
      amount: guessHeader(parsed.headers, HEADER_GUESSES.amount),
    };
    setMapping(initialMapping);
  }

  async function buildPreview() {
    if (!csv) return;
    setLoading(true);
    setMessage(null);

    const rows = csv.rows.map((r) => ({
      date: parseDate(r[mapping.date] ?? ""),
      description: (r[mapping.description] ?? "").trim(),
      amount: parseAmount(r[mapping.amount] ?? "0"),
    }));

    const dates = rows.map((r) => r.date).filter(Boolean).sort();
    const from = dates[0];
    const to = dates[dates.length - 1];

    const { data: existing } = from
      ? await createClient().from("movements").select("date, description, amount").gte("date", from).lte("date", to)
      : { data: [] };

    const existingKeys = new Set((existing ?? []).map((m) => `${m.date}|${m.description}|${m.amount}`));

    const built: PreviewRow[] = rows
      .filter((r) => r.description && r.date)
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

    setPreview(built);
    setLoading(false);
  }

  function updateRow(index: number, patch: Partial<PreviewRow>) {
    setPreview((prev) => prev?.map((row, i) => (i === index ? { ...row, ...patch } : row)) ?? null);
  }

  async function confirmImport() {
    if (!preview) return;
    setLoading(true);
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
      const { error } = await createClient().from("movements").insert(rowsToInsert);
      if (error) {
        setMessage(`Error al importar: ${error.message}`);
        setLoading(false);
        return;
      }
    }

    if (bankName.trim() && !existingProfile) {
      await createClient()
        .from("csv_import_profiles")
        .upsert({ bank_name: bankName.trim(), column_mapping: mapping }, { onConflict: "user_id,bank_name" });
    }

    setLoading(false);
    setMessage(`Se importaron ${rowsToInsert.length} movimientos.`);
    setPreview(null);
    setCsv(null);
    router.refresh();
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium">Banco</label>
          <input
            list="bank-profiles"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            placeholder="BBVA, Santander, Wise, MyInvestor..."
            className="w-full rounded-md border border-input px-3 py-2 text-sm bg-transparent"
          />
          <datalist id="bank-profiles">
            {profiles.map((p) => (
              <option key={p.bank_name} value={p.bank_name} />
            ))}
          </datalist>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Cuenta destino</label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="w-full rounded-md border border-input px-3 py-2 text-sm bg-transparent"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Tipo</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as MovementType)}
            className="w-full rounded-md border border-input px-3 py-2 text-sm bg-transparent"
          >
            <option value="personal">Personal</option>
            <option value="freelance">Freelance</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Archivo CSV</label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            className="w-full text-sm"
          />
        </div>
      </div>

      {csv && !existingProfile && (
        <div className="rounded-lg border border-border p-4">
          <p className="mb-3 text-sm font-medium">
            Primera vez con este banco: indicá qué columna del CSV corresponde a cada campo.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {(["date", "description", "amount"] as const).map((field) => (
              <div key={field} className="space-y-1">
                <label className="text-xs font-medium uppercase text-muted-foreground">
                  {field === "date" ? "Fecha" : field === "description" ? "Descripción" : "Monto"}
                </label>
                <select
                  value={mapping[field]}
                  onChange={(e) => setMapping((m) => ({ ...m, [field]: e.target.value }))}
                  className="w-full rounded-md border border-input px-2 py-1 text-sm bg-transparent"
                >
                  {csv.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {csv && (
        <Button
          onClick={buildPreview}
          disabled={loading || !mapping.date || !mapping.description || !mapping.amount}
        >
          Previsualizar
        </Button>
      )}

      {preview && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {preview.length} movimientos encontrados · {preview.filter((r) => r.duplicate).length} posibles
            duplicados (desmarcados por defecto).
          </p>
          <div className="max-h-96 overflow-y-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Incluir</th>
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Descripción</th>
                  <th className="px-3 py-2 text-right">Monto</th>
                  <th className="px-3 py-2">Categoría</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr
                    key={i}
                    className={`border-t border-border ${
                      row.duplicate ? "opacity-50" : ""
                    }`}
                  >
                    <td className="px-3 py-1.5">
                      <input
                        type="checkbox"
                        checked={row.include}
                        onChange={(e) => updateRow(i, { include: e.target.checked })}
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-1.5">{row.date}</td>
                    <td className="px-3 py-1.5">{row.description}</td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">
                      {formatCurrency(row.amount)}
                    </td>
                    <td className="px-3 py-1.5">
                      <select
                        value={row.category_id ?? ""}
                        onChange={(e) => updateRow(i, { category_id: e.target.value || null, subcategory_id: null })}
                        className="rounded-md border border-input px-1 py-0.5 text-xs bg-transparent"
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

          <Button onClick={confirmImport} disabled={loading}>
            {loading ? "Importando..." : "Confirmar importación"}
          </Button>
        </div>
      )}

      {message && <p className="text-sm">{message}</p>}
    </div>
  );
}
