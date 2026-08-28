"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/format";

const INCOME_COLOR = "#059669"; // emerald-600
const EXPENSE_COLOR = "#dc2626"; // red-600
const BAR_COLOR = "#2563eb"; // blue-600

export function IncomeExpenseLineChart({
  data,
}: {
  data: { date: string; ingresos: number; gastos: number }[];
}) {
  if (data.length === 0) return <EmptyState />;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatCurrency(v)} width={80} />
        <Tooltip formatter={(v) => formatCurrency(Number(v))} />
        <Legend />
        <Line type="monotone" dataKey="ingresos" name="Ingresos" stroke={INCOME_COLOR} strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="gastos" name="Gastos" stroke={EXPENSE_COLOR} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function CategoryBarChart({ data }: { data: { name: string; value: number }[] }) {
  if (data.length === 0) return <EmptyState />;

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 36)}>
      <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => formatCurrency(v)} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={140} />
        <Tooltip formatter={(v) => formatCurrency(Number(v))} />
        <Bar dataKey="value" fill={EXPENSE_COLOR} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ClientIncomeBarChart({ data }: { data: { name: string; value: number }[] }) {
  if (data.length === 0) return <EmptyState />;

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 36)}>
      <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => formatCurrency(v)} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={140} />
        <Tooltip formatter={(v) => formatCurrency(Number(v))} />
        <Bar dataKey="value" fill={BAR_COLOR} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function EmptyState() {
  return (
    <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
      Sin datos en este periodo
    </div>
  );
}
