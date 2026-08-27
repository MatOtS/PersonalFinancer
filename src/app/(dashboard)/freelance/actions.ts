"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { markInvoicePaid } from "@/lib/queries/invoices";
import { todayISO } from "@/lib/format";

export async function markInvoicePaidAction(invoiceId: string) {
  const supabase = await createClient();
  await markInvoicePaid(supabase, invoiceId, todayISO());
  revalidatePath("/freelance");
  revalidatePath("/home");
}
