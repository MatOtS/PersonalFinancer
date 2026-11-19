import type { ClientRecord } from "@/data/clients";
import { ClientForm } from "./client-form";

export const ClientsSection = ({ clients }: { clients: ClientRecord[] }) => {
  return (
    <section
      id="clientes"
      aria-labelledby="clientes-title"
      className="mt-6 rounded-lg border border-border bg-surface p-6 shadow-card"
    >
      <ClientForm
        heading={
          <h2 id="clientes-title" className="text-h2 font-semibold">
            Clientes
          </h2>
        }
      />
      {clients.length === 0 ? (
        <p className="mt-6 text-small text-text-muted">
          Aún no tienes clientes.
        </p>
      ) : (
        <ul className="mt-6">
          {clients.map((client) => (
            <li
              key={`${client.id}-${client.name}-${client.taxId}-${client.address}-${client.email}`}
              className="border-t border-border pt-2"
            >
              <ClientForm
                client={client}
                heading={<p className="font-semibold">{client.name}</p>}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
