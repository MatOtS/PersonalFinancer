"use client";

import { useState } from "react";
import { createInvoiceAction } from "./actions";
import { todayISO } from "@/lib/format";
import { Button } from "@/components/ui/button";

interface Props {
  clients: { id: string; name: string }[];
  defaultIrpf: number;
  defaultIva: number;
  nextInvoiceNumber: string;
}

export function InvoiceForm({ clients, defaultIrpf, defaultIva, nextInvoiceNumber }: Props) {
  const [amount, setAmount] = useState(0);
  const [irpf, setIrpf] = useState(defaultIrpf);
  const [iva, setIva] = useState(defaultIva);

  const net = amount - (amount * irpf) / 100 + (amount * iva) / 100;

  return (
    <form action={createInvoiceAction} className="max-w-md space-y-4">
      <p className="text-sm text-muted-foreground">
        Próximo número de factura: <span className="font-medium">{nextInvoiceNumber}</span>
      </p>

      <div className="space-y-1">
        <label className="text-sm font-medium">Cliente</label>
        <select
          name="client_id"
          required
          className="w-full rounded-md border border-input px-3 py-2 text-sm bg-transparent"
        >
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {clients.length === 0 && (
          <p className="text-xs text-amber-600">Primero agregá un cliente desde Ajustes.</p>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Fecha de emisión</label>
        <input
          type="date"
          name="issue_date"
          defaultValue={todayISO()}
          required
          className="w-full rounded-md border border-input px-3 py-2 text-sm bg-transparent"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Importe (base)</label>
        <input
          type="number"
          name="amount"
          step="0.01"
          min="0"
          required
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-full rounded-md border border-input px-3 py-2 text-sm bg-transparent"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">IRPF %</label>
          <input
            type="number"
            name="irpf_pct"
            step="0.01"
            value={irpf}
            onChange={(e) => setIrpf(Number(e.target.value))}
            className="w-full rounded-md border border-input px-3 py-2 text-sm bg-transparent"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">IVA %</label>
          <input
            type="number"
            name="iva_pct"
            step="0.01"
            value={iva}
            onChange={(e) => setIva(Number(e.target.value))}
            className="w-full rounded-md border border-input px-3 py-2 text-sm bg-transparent"
          />
        </div>
      </div>

      <p className="text-sm">
        Monto neto estimado: <span className="font-semibold">{net.toFixed(2)} €</span>
      </p>

      <Button type="submit" disabled={clients.length === 0} className="w-full">
        Crear factura
      </Button>
    </form>
  );
}
