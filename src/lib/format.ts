const currencyFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

export function formatCurrency(amount: number) {
  return currencyFormatter.format(amount);
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
    new Date(date)
  );
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function monthAgoISO() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
}
