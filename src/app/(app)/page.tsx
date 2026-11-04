import { ChartLineUpIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { listAccounts } from "@/data/accounts";

export default async function HomePage() {
  const accounts = await listAccounts();

  return (
    <>
      <h1 className="text-h1 font-bold">Inicio</h1>
      <p className="mt-1 text-body text-text-muted">
        Bienvenido a PersonalFinancer
      </p>

      <div className="mt-6 rounded-lg border border-border bg-surface shadow-card">
        <EmptyState
          icon={<ChartLineUpIcon size={20} />}
          text="Aún no hay datos. El resumen aparecerá aquí cuando añadas tus cuentas y movimientos."
          action={
            accounts.length === 0 ? (
              <Link
                href="/ajustes#cuentas"
                className={buttonClassName("primary")}
              >
                Añadir cuenta
              </Link>
            ) : undefined
          }
        />
      </div>
    </>
  );
}
