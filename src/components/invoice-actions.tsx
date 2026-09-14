"use client";

import { useTransition } from "react";
import { FilePdfIcon } from "@phosphor-icons/react";
import {
  deleteDraftInvoiceAction,
  issueInvoiceAction,
  markInvoicePaidAction,
} from "@/app/(dashboard)/freelance/actions";
import { Button } from "@/components/ui/button";
import type { InvoiceStatus } from "@/lib/supabase/types";

/**
 * One control set per state: a draft is issued or discarded, an issued invoice
 * is marked paid, a paid one is done. The PDF only exists once the invoice has
 * a number, so drafts get no download link.
 */
export function InvoiceActions({ id, status }: { id: string; status: InvoiceStatus }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-nowrap items-center justify-end gap-1.5 whitespace-nowrap">
      {status === "draft" && (
        <>
          <Button
            disabled={isPending}
            onClick={() => startTransition(() => issueInvoiceAction(id))}
            size="xs"
          >
            Emitir
          </Button>
          <Button
            disabled={isPending}
            onClick={() => startTransition(() => deleteDraftInvoiceAction(id))}
            size="xs"
            variant="ghost"
          >
            Descartar
          </Button>
        </>
      )}

      {status === "issued" && (
        <Button
          disabled={isPending}
          onClick={() => startTransition(() => markInvoicePaidAction(id))}
          size="xs"
        >
          Marcar cobrada
        </Button>
      )}

      {status !== "draft" && (
        <Button
          nativeButton={false}
          render={<a href={`/api/invoices/${id}/pdf`} rel="noopener" target="_blank" />}
          size="xs"
          variant="outline"
        >
          <FilePdfIcon /> PDF
        </Button>
      )}
    </div>
  );
}
