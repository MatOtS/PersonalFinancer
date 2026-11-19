"use client";

import { useActionState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import type { ClientRecord } from "@/data/clients";
import {
  addClientAction,
  updateClientAction,
  type ClientFormState,
} from "./client-actions";

// The same form adds a client (no `client`) and edits one.
// `heading` is the title of the form; the save button sits at the far right of
// its row.
export const ClientForm = ({
  client,
  heading,
}: {
  client?: ClientRecord;
  heading: ReactNode;
}) => {
  const initial: ClientFormState = {
    values: {
      name: client?.name ?? "",
      taxId: client?.taxId ?? "",
      address: client?.address ?? "",
      email: client?.email ?? "",
    },
    errors: {},
    message: null,
    saved: false,
  };
  const [state, formAction, pending] = useActionState(
    client ? updateClientAction : addClientAction,
    initial,
  );

  return (
    <form
      action={formAction}
      aria-label={client ? `Editar ${client.name}` : "Añadir cliente"}
      className="mt-4 grid items-start gap-3 sm:grid-cols-2"
    >
      {client && <input type="hidden" name="id" value={client.id} />}
      <div className="flex items-center justify-between gap-3 sm:col-span-2">
        {heading}
        <Button type="submit" variant="primary" disabled={pending}>
          {client ? "Guardar cliente" : "Añadir cliente"}
        </Button>
      </div>
      {state.message && (
        <p role="alert" className="text-small text-negative sm:col-span-2">
          {state.message}
        </p>
      )}
      <TextField
        label="Nombre"
        name="name"
        autoComplete="off"
        defaultValue={state.values.name}
        error={state.errors.name}
      />
      <TextField
        label="NIF o CIF"
        name="taxId"
        autoComplete="off"
        defaultValue={state.values.taxId}
        error={state.errors.taxId}
      />
      <div className="sm:col-span-2">
        <TextField
          label="Dirección"
          name="address"
          autoComplete="off"
          defaultValue={state.values.address}
          error={state.errors.address}
        />
      </div>
      <TextField
        label="Email"
        name="email"
        type="email"
        autoComplete="off"
        defaultValue={state.values.email}
        error={state.errors.email}
      />
    </form>
  );
};
