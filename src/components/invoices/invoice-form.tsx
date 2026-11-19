"use client";

import Link from "next/link";
import { startTransition, useActionState, useMemo, useState } from "react";
import {
  saveInvoiceAction,
  type InvoiceFormState,
} from "@/app/(app)/facturas/actions";
import { Button, buttonClassName } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import type { ClientRecord } from "@/data/clients";
import type { InvoiceDetail } from "@/data/invoices";
import {
  dueDateFrom,
  invoiceTotals,
  parsePercent,
  parseQuantity,
  percentText,
  type InvoiceInput,
  type LineInput,
} from "@/domain/invoices";
import { formatCents, parseAmount } from "@/domain/money";

type Defaults = { irpfBp: number; ivaBp: number; dueDays: number };
type Props = {
  clients: ClientRecord[];
  defaults: Defaults;
  today: string;
  // Present when a draft is edited.
  invoice?: InvoiceDetail;
};

const emptyLine = (): LineInput => ({
  description: "",
  quantity: "1",
  unitPrice: "",
});

const centsText = (cents: number) => formatCents(cents).replace(/ €$/, "");
const quantityText = (hundredths: number) => percentText(hundredths);

export const InvoiceForm = ({ clients, defaults, today, invoice }: Props) => {
  const initial: InvoiceInput = invoice
    ? {
        clientId: invoice.clientId,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate ?? "",
        irpf: percentText(invoice.irpfBp),
        iva: percentText(invoice.ivaBp),
        lines: invoice.lines.map((line) => ({
          description: line.description,
          quantity: quantityText(line.quantityHundredths),
          unitPrice: centsText(line.unitPriceCents),
        })),
      }
    : {
        clientId: "",
        issueDate: today,
        dueDate: dueDateFrom(today, defaults.dueDays),
        irpf: percentText(defaults.irpfBp),
        iva: percentText(defaults.ivaBp),
        lines: [emptyLine()],
      };

  const [values, setValues] = useState<InvoiceInput>(initial);
  const [dueTouched, setDueTouched] = useState(Boolean(invoice));
  const set = <K extends keyof InvoiceInput>(key: K, value: InvoiceInput[K]) =>
    setValues((current) => ({ ...current, [key]: value }));
  const setLine = (index: number, patch: Partial<LineInput>) =>
    set(
      "lines",
      values.lines.map((line, i) =>
        i === index ? { ...line, ...patch } : line,
      ),
    );

  const [state, formAction, pending] = useActionState(
    async (previous: InvoiceFormState, formData: FormData) => {
      const next = await saveInvoiceAction(previous, formData);
      setValues(next.values);
      return next;
    },
    { values: initial, errors: {}, message: null } satisfies InvoiceFormState,
  );

  // The totals as the user types: only the lines that are complete count.
  const totals = useMemo(() => {
    const lines = values.lines.flatMap((line) => {
      const quantity = parseQuantity(line.quantity);
      const price = parseAmount(line.unitPrice);
      if (
        "error" in quantity ||
        "error" in price ||
        line.description.trim() === ""
      ) {
        return [];
      }
      return [
        {
          description: line.description,
          quantityHundredths: quantity.hundredths,
          unitPriceCents: price.cents,
        },
      ];
    });
    const irpf = parsePercent(values.irpf);
    const iva = parsePercent(values.iva);
    return invoiceTotals(
      lines,
      "bp" in irpf ? irpf.bp : 0,
      "bp" in iva ? iva.bp : 0,
    );
  }, [values]);

  return (
    <form
      aria-label={invoice ? "Editar factura" : "Nueva factura"}
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(() => formAction(data));
      }}
      className="mt-6 flex flex-col gap-4 rounded-lg border border-border bg-surface p-6 shadow-card"
    >
      {invoice && <input type="hidden" name="id" value={invoice.id} />}
      <input type="hidden" name="lines" value={JSON.stringify(values.lines)} />
      {state.message && (
        <p role="alert" className="text-small text-negative">
          {state.message}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField
          label="Cliente"
          name="clientId"
          options={clients.map((c) => ({ value: c.id, label: c.name }))}
          value={values.clientId || null}
          onValueChange={(id) => set("clientId", id ?? "")}
          placeholder="Cliente de la factura"
          error={state.errors.clientId}
        />
        <TextField
          label="Fecha de emisión"
          type="date"
          name="issueDate"
          value={values.issueDate}
          onChange={(event) => {
            const issueDate = event.target.value;
            setValues((current) => ({
              ...current,
              issueDate,
              dueDate:
                dueTouched || issueDate === ""
                  ? current.dueDate
                  : dueDateFrom(issueDate, defaults.dueDays),
            }));
          }}
          error={state.errors.issueDate}
        />
        <TextField
          label="Vencimiento"
          type="date"
          name="dueDate"
          value={values.dueDate}
          onChange={(event) => {
            setDueTouched(true);
            set("dueDate", event.target.value);
          }}
          error={state.errors.dueDate}
        />
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-small font-semibold">Líneas</legend>
        {values.lines.map((line, index) => (
          <div
            key={index}
            className="grid items-end gap-3 sm:grid-cols-[1fr_7rem_9rem_auto]"
          >
            <TextField
              label={`Concepto ${index + 1}`}
              autoComplete="off"
              value={line.description}
              onChange={(event) =>
                setLine(index, { description: event.target.value })
              }
            />
            <TextField
              label={`Cantidad ${index + 1}`}
              inputMode="decimal"
              autoComplete="off"
              alignRight
              value={line.quantity}
              onChange={(event) =>
                setLine(index, { quantity: event.target.value })
              }
            />
            <TextField
              label={`Precio ${index + 1}`}
              inputMode="decimal"
              autoComplete="off"
              alignRight
              value={line.unitPrice}
              onChange={(event) =>
                setLine(index, { unitPrice: event.target.value })
              }
            />
            <Button
              variant="ghost-destructive"
              aria-label={`Quitar línea ${index + 1}`}
              disabled={values.lines.length === 1}
              onClick={() =>
                set(
                  "lines",
                  values.lines.filter((_, i) => i !== index),
                )
              }
            >
              Quitar
            </Button>
          </div>
        ))}
        {state.errors.lines && (
          <p role="alert" className="text-small text-negative">
            {state.errors.lines}
          </p>
        )}
        <div>
          <Button
            variant="secondary"
            onClick={() => set("lines", [...values.lines, emptyLine()])}
          >
            Añadir línea
          </Button>
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-4">
        <TextField
          label="IVA (%)"
          name="iva"
          inputMode="decimal"
          autoComplete="off"
          alignRight
          value={values.iva}
          onChange={(event) => set("iva", event.target.value)}
          error={state.errors.iva}
        />
        <TextField
          label="IRPF (%)"
          name="irpf"
          inputMode="decimal"
          autoComplete="off"
          alignRight
          value={values.irpf}
          onChange={(event) => set("irpf", event.target.value)}
          error={state.errors.irpf}
        />
        <dl className="text-right tabular-nums sm:col-span-2">
          <div className="flex justify-between gap-6">
            <dt className="text-text-muted">Base imponible</dt>
            <dd>{formatCents(totals.baseCents)}</dd>
          </div>
          <div className="flex justify-between gap-6">
            <dt className="text-text-muted">IVA</dt>
            <dd>{formatCents(totals.ivaCents)}</dd>
          </div>
          <div className="flex justify-between gap-6">
            <dt className="text-text-muted">IRPF</dt>
            <dd>-{formatCents(totals.irpfCents)}</dd>
          </div>
          <div className="flex justify-between gap-6 font-bold">
            <dt>Total</dt>
            <dd>{formatCents(totals.totalCents)}</dd>
          </div>
        </dl>
      </div>

      <div className="flex justify-end gap-3">
        <Link href="/freelance" className={buttonClassName("secondary")}>
          Cancelar
        </Link>
        <Button type="submit" variant="primary" disabled={pending}>
          Guardar borrador
        </Button>
      </div>
    </form>
  );
};
