import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, MovementType } from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;

export interface PeriodFilter {
  from: string;
  to: string;
  type?: MovementType;
}

export async function getAccountBalances(supabase: Client) {
  const { data, error } = await supabase.from("account_balances").select("*").order("name");
  if (error) throw error;
  return data;
}

export async function getMovements(supabase: Client, { from, to, type }: PeriodFilter) {
  let query = supabase
    .from("movements")
    .select(
      "id, date, description, amount, is_fixed_expense, account:accounts(name), category:categories(name), subcategory:subcategories(name), client:clients(name)"
    )
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: false });

  if (type) query = query.eq("type", type);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export function summarize(movements: { amount: number }[]) {
  const income = movements.filter((m) => m.amount > 0).reduce((sum, m) => sum + m.amount, 0);
  const expense = movements.filter((m) => m.amount < 0).reduce((sum, m) => sum + Math.abs(m.amount), 0);
  return {
    income,
    expense,
    balance: income - expense,
    avgIncome: income / Math.max(1, movements.filter((m) => m.amount > 0).length),
    avgExpense: expense / Math.max(1, movements.filter((m) => m.amount < 0).length),
  };
}

export function groupByCategory(
  movements: { amount: number; category: { name: string } | { name: string }[] | null }[]
) {
  const totals = new Map<string, number>();
  for (const m of movements) {
    if (m.amount >= 0) continue;
    const category = Array.isArray(m.category) ? m.category[0] : m.category;
    const name = category?.name ?? "Sin categoría";
    totals.set(name, (totals.get(name) ?? 0) + Math.abs(m.amount));
  }
  return Array.from(totals, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

export function groupByDate(movements: { date: string; amount: number }[]) {
  const byDate = new Map<string, { date: string; ingresos: number; gastos: number }>();
  for (const m of movements) {
    const entry = byDate.get(m.date) ?? { date: m.date, ingresos: 0, gastos: 0 };
    if (m.amount >= 0) entry.ingresos += m.amount;
    else entry.gastos += Math.abs(m.amount);
    byDate.set(m.date, entry);
  }
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export async function getFixedExpenses(supabase: Client) {
  const { data, error } = await supabase
    .from("fixed_expenses")
    .select("id, name, amount, frequency, active")
    .eq("active", true)
    .order("name");
  if (error) throw error;
  return data;
}

export async function getIncomeByClient(supabase: Client, { from, to }: PeriodFilter) {
  const { data, error } = await supabase
    .from("movements")
    .select("amount, client:clients(name)")
    .eq("type", "freelance")
    .gte("date", from)
    .lte("date", to)
    .gt("amount", 0)
    .not("client_id", "is", null);
  if (error) throw error;

  const totals = new Map<string, number>();
  for (const m of data) {
    const client = Array.isArray(m.client) ? m.client[0] : m.client;
    const name = client?.name ?? "Sin cliente";
    totals.set(name, (totals.get(name) ?? 0) + m.amount);
  }
  return Array.from(totals, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}
