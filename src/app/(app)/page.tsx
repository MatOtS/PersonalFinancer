import { ChartLineUpIcon } from "@phosphor-icons/react/ssr";
import { EmptyState } from "@/components/ui/empty-state";

export default function HomePage() {
  return (
    <>
      <h1 className="text-h1 font-bold">Inicio</h1>
      <p className="mt-1 text-body text-text-muted">
        Bienvenido a PersonalFinancer
      </p>

      {/* Temporary exception to design.md: no action yet, accounts arrive in
          a later spec (see spec 001-app-shell, FR-27). */}
      <div className="mt-6 rounded-lg border border-border bg-surface shadow-card">
        <EmptyState
          icon={<ChartLineUpIcon size={20} />}
          text="Aún no hay datos. El resumen aparecerá aquí cuando añadas tus cuentas y movimientos."
        />
      </div>
    </>
  );
}
