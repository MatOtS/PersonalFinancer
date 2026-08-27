"use client";

import { useTransition } from "react";
import { markInvoicePaidAction } from "@/app/(dashboard)/freelance/actions";

export function MarkPaidButton({ invoiceId }: { invoiceId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      disabled={isPending}
      onClick={() => startTransition(() => markInvoicePaidAction(invoiceId))}
      className="rounded-md bg-neutral-900 px-2 py-1 text-xs font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
    >
      {isPending ? "..." : "Marcar cobrada"}
    </button>
  );
}
