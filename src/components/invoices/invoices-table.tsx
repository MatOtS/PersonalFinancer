"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  deleteDraftAction,
  issueInvoiceAction,
  payInvoiceAction,
  type InvoiceActionState,
} from "@/app/(app)/facturas/actions";
import { Button, buttonClassName } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { InvoiceSummary } from "@/data/invoices";
import { STATUS_LABEL } from "@/domain/invoices";
import { formatCents } from "@/domain/money";

const NONE: InvoiceActionState = { message: null };

const formatDate = (iso: string) => iso.split("-").reverse().join("/");

// A button that runs one action over the invoice (issue, delete, pay).
const ActionForm = ({
  action,
  id,
  onMessage,
  children,
}: {
  action: (
    previous: InvoiceActionState,
    formData: FormData,
  ) => Promise<InvoiceActionState>;
  id: string;
  onMessage: (message: string | null) => void;
  children: React.ReactNode;
}) => {
  const [, formAction, pending] = useActionState(
    async (previous: InvoiceActionState, formData: FormData) => {
      const next = await action(previous, formData);
      onMessage(next.message);
      return next;
    },
    NONE,
  );
  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <fieldset disabled={pending} className="flex items-center gap-2">
        {children}
      </fieldset>
    </form>
  );
};

export const InvoicesTable = ({
  invoices,
  today,
}: {
  invoices: InvoiceSummary[];
  // Today's date in Madrid, the payment date it starts with.
  today: string;
}) => {
  const [notice, setNotice] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<InvoiceSummary | null>(null);

  return (
    <div>
      <p role="alert" className="mb-2 min-h-5 text-small text-negative">
        {notice}
      </p>
      {invoices.length === 0 ? (
        <p className="text-small text-text-muted">Aún no tienes facturas.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-small">
            <caption className="sr-only">
              Facturas con número, cliente, fechas, importe y estado
            </caption>
            <thead>
              <tr className="border-b border-border text-text-muted">
                <th scope="col" className="py-2 pr-3 font-semibold">
                  Número
                </th>
                <th scope="col" className="py-2 pr-3 font-semibold">
                  Cliente
                </th>
                <th scope="col" className="py-2 pr-3 font-semibold">
                  Emisión
                </th>
                <th scope="col" className="py-2 pr-3 font-semibold">
                  Vencimiento
                </th>
                <th scope="col" className="py-2 pr-3 text-right font-semibold">
                  Importe
                </th>
                <th scope="col" className="py-2 pr-3 font-semibold">
                  Estado
                </th>
                <th scope="col" className="py-2 font-semibold">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr
                  key={invoice.id}
                  className="border-b border-border last:border-b-0"
                >
                  <td className="py-2 pr-3">{invoice.number ?? "—"}</td>
                  <td className="py-2 pr-3">{invoice.clientName}</td>
                  <td className="py-2 pr-3 tabular-nums">
                    {formatDate(invoice.issueDate)}
                  </td>
                  <td className="py-2 pr-3 tabular-nums">
                    {invoice.dueDate ? formatDate(invoice.dueDate) : "—"}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {formatCents(invoice.netCents)}
                  </td>
                  <td className="py-2 pr-3">{STATUS_LABEL[invoice.status]}</td>
                  <td className="py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {invoice.status === "draft" && (
                        <>
                          <Link
                            href={`/facturas/${invoice.id}`}
                            className={buttonClassName("ghost")}
                          >
                            Editar
                          </Link>
                          <ActionForm
                            action={issueInvoiceAction}
                            id={invoice.id}
                            onMessage={setNotice}
                          >
                            <Button type="submit" variant="primary">
                              Emitir
                            </Button>
                          </ActionForm>
                          <Button
                            variant="ghost-destructive"
                            aria-label={`Eliminar el borrador de ${invoice.clientName}`}
                            onClick={() => setToDelete(invoice)}
                          >
                            Eliminar
                          </Button>
                        </>
                      )}
                      {invoice.status === "issued" && (
                        <ActionForm
                          action={payInvoiceAction}
                          id={invoice.id}
                          onMessage={setNotice}
                        >
                          <input
                            type="date"
                            name="paidDate"
                            defaultValue={today}
                            aria-label={`Fecha de cobro de ${invoice.number}`}
                            className="h-9 rounded-sm border border-control-border bg-surface px-2"
                          />
                          <Button type="submit" variant="secondary">
                            Marcar como cobrada
                          </Button>
                        </ActionForm>
                      )}
                      {invoice.status !== "draft" && (
                        <a
                          href={`/api/invoices/${invoice.id}/pdf`}
                          className={buttonClassName("ghost")}
                        >
                          PDF
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {toDelete && (
        <form
          id="delete-draft"
          action={async (formData) => {
            const next = await deleteDraftAction(NONE, formData);
            setNotice(next.message);
            setToDelete(null);
          }}
        >
          <input type="hidden" name="id" value={toDelete.id} />
        </form>
      )}
      <ConfirmDialog
        open={toDelete !== null}
        title="¿Eliminar el borrador?"
        description={`Se eliminará el borrador de ${toDelete?.clientName ?? ""}. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={() =>
          (
            document.getElementById("delete-draft") as HTMLFormElement | null
          )?.requestSubmit()
        }
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
};
