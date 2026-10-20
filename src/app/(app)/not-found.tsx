import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";

export default function NotFound() {
  return (
    <>
      <h1 className="text-h1 font-bold">Página no encontrada</h1>
      <p className="mt-1 text-body text-text-muted">
        La dirección que has abierto no existe. Revisa que esté bien escrita o
        vuelve al inicio.
      </p>
      <Link href="/" className={buttonClassName("secondary", "mt-6")}>
        Volver a Inicio
      </Link>
    </>
  );
}
