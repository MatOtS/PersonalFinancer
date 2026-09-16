"use client";

import { useMemo, useState } from "react";
import { PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { createInvoiceAction } from "./actions";
import { invoiceTotals } from "@/lib/queries/invoices";
import { formatCurrency, todayISO } from "@/lib/format";
import { Button } from "@/components/ui/button";

interface ClientOption {
  id: string;
  name: string;
  tax_id: string | null;
  address: string | null;
}

interface Line {
  description: string;
  quantity: string;
  unit_price: string;
}

const emptyLine = (): Line => ({ description: "", quantity: "1", unit_price: "" });

const field = "w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm";

function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function InvoiceForm({
  clients,
  defaultIrpf,
  defaultIva,
  defaultDueDays,
  nextInvoiceNumber,
}: {
  clients: ClientOption[];
  defaultIrpf: number;
  defaultIva: number;
  defaultDueDays: number;
  nextInvoiceNumber: string;
}) {
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [issueDate, setIssueDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState(addDays(todayISO(), defaultDueDays));
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [irpf, setIrpf] = useState(String(defaultIrpf));
  const [iva, setIva] = useState(String(defaultIva));

  const totals = useMemo(
    () =>
      invoiceTotals(
        lines.map((l) => ({
          description: l.description,
          quantity: Number(l.quantity) || 0,
          unit_price: Number(l.unit_price) || 0,
        })),
        Number(irpf) || 0,
        Number(iva) || 0
      ),
    [lines, irpf, iva]
  );

  const selectedClient = clients.find((c) => c.id === clientId);
  // A Spanish invoice needs the client's tax ID and address; warn before the
  // PDF comes out incomplete rather than after.
  const missingClientData =
    selectedClient && (!selectedClient.tax_id || !selectedClient.address);

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((current) => current.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function removeLine(index: number) {
    setLines((current) => (current.length === 1 ? current : current.filter((_, i) => i !== index)));
  }

  // The issue date drives the due date until the user overrides it by hand.
  function changeIssueDate(value: string) {
    setIssueDate(value);
    if (value) setDueDate(addDays(value, defaultDueDays));
  }

  const hasContent = lines.some((l) => l.description.trim() !== "");

  return (
    <form action={createInvoiceAction} className="max-w-3xl space-y-6">
      <input name="due_date" type="hidden" value={dueDate} />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm font-medium">
          Cliente
          <select
            className={field}
            name="client_id"
            onChange={(e) => setClientId(e.target.value)}
            required
            value={clientId}
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <div className="space-y-1 text-sm">
          <span className="font-medium">N.º al emitir</span>
          <p className={`${field} text-muted-foreground`}>{nextInvoiceNumber}</p>
        </div>

        <label className="space-y-1 text-sm font-medium">
          Fecha de emisión
          <input
            className={field}
            name="issue_date"
            onChange={(e) => changeIssueDate(e.target.value)}
            required
            type="date"
            value={issueDate}
          />
        </label>

        <label className="space-y-1 text-sm font-medium">
          Fecha de vencimiento
          <input
            className={field}
            onChange={(e) => setDueDate(e.target.value)}
            type="date"
            value={dueDate}
          />
        </label>
      </div>

      {clients.length === 0 && (
        <p className="text-sm text-amber-600">Primero agregá un cliente más abajo.</p>
      )}
      {missingClientData && (
        <p className="text-sm text-amber-600">
          A {selectedClient?.name} le falta el CIF o la dirección. Completalos en Ajustes → Clientes
          para que la factura sea válida.
        </p>
      )}

      <fieldset className="space-y-3">
        <legend className="font-medium text-sm">Conceptos</legend>

        <div className="hidden gap-3 px-1 text-muted-foreground text-xs sm:grid sm:grid-cols-[1fr_5rem_7rem_7rem_2.25rem]">
          <span>Descripción</span>
          <span className="text-right">Cantidad</span>
          <span className="text-right">Precio</span>
          <span className="text-right">Importe</span>
          <span />
        </div>

        {lines.map((line, index) => (
          <div
            className="grid gap-3 sm:grid-cols-[1fr_5rem_7rem_7rem_2.25rem] sm:items-center"
            key={index}
          >
            <input
              aria-label={`Descripción del concepto ${index + 1}`}
              className={field}
              name="line_description"
              onChange={(e) => updateLine(index, { description: e.target.value })}
              placeholder="Edición de vídeo — campaña marzo"
              value={line.description}
            />
            <input
              aria-label={`Cantidad del concepto ${index + 1}`}
              className={`${field} text-right tabular-nums`}
              min="0"
              name="line_quantity"
              onChange={(e) => updateLine(index, { quantity: e.target.value })}
              step="0.01"
              type="number"
              value={line.quantity}
            />
            <input
              aria-label={`Precio del concepto ${index + 1}`}
              className={`${field} text-right tabular-nums`}
              min="0"
              name="line_unit_price"
              onChange={(e) => updateLine(index, { unit_price: e.target.value })}
              placeholder="0,00"
              step="0.01"
              type="number"
              value={line.unit_price}
            />
            <p className="px-1 text-right text-sm tabular-nums sm:px-0">
              {formatCurrency((Number(line.quantity) || 0) * (Number(line.unit_price) || 0))}
            </p>
            <Button
              aria-label={`Quitar concepto ${index + 1}`}
              disabled={lines.length === 1}
              onClick={() => removeLine(index)}
              size="icon"
              type="button"
              variant="ghost"
            >
              <TrashIcon />
            </Button>
          </div>
        ))}

        <Button
          onClick={() => setLines((current) => [...current, emptyLine()])}
          size="sm"
          type="button"
          variant="outline"
        >
          <PlusIcon /> Añadir concepto
        </Button>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1 text-sm font-medium">
            IRPF %
            <input
              className={field}
              name="irpf_pct"
              onChange={(e) => setIrpf(e.target.value)}
              step="0.01"
              type="number"
              value={irpf}
            />
          </label>
          <label className="space-y-1 text-sm font-medium">
            IVA %
            <input
              className={field}
              name="iva_pct"
              onChange={(e) => setIva(e.target.value)}
              step="0.01"
              type="number"
              value={iva}
            />
          </label>
        </div>

        <dl className="space-y-1 rounded-lg border border-border p-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Base imponible</dt>
            <dd className="tabular-nums">{formatCurrency(totals.base)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">IVA ({Number(iva) || 0}%)</dt>
            <dd className="tabular-nums">{formatCurrency(totals.iva)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">IRPF ({Number(irpf) || 0}%)</dt>
            <dd className="tabular-nums">-{formatCurrency(totals.irpf)}</dd>
          </div>
          <div className="flex justify-between border-border border-t pt-2 font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatCurrency(totals.total)}</dd>
          </div>
        </dl>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button disabled={clients.length === 0 || !hasContent} name="intent" type="submit" value="issue">
          Emitir factura
        </Button>
        <Button
          disabled={clients.length === 0 || !hasContent}
          name="intent"
          type="submit"
          value="draft"
          variant="outline"
        >
          Guardar como borrador
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">
        El número correlativo se asigna al emitir, así un borrador descartado no deja huecos en la
        serie.
      </p>
    </form>
  );
}
