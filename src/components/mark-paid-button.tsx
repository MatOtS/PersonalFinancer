"use client";

import { useTransition } from "react";
import { markInvoicePaidAction } from "@/app/(dashboard)/freelance/actions";
import { Button } from "@/components/ui/button";

export function MarkPaidButton({ invoiceId }: { invoiceId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      size="xs"
      disabled={isPending}
      onClick={() => startTransition(() => markInvoicePaidAction(invoiceId))}
    >
      {isPending ? "..." : "Marcar cobrada"}
    </Button>
  );
}
