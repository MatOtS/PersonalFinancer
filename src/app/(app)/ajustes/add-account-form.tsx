"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { addAccountAction, type AccountFormState } from "./actions";

const INITIAL: AccountFormState = {
  name: "",
  openingBalance: "",
  errors: {},
  message: null,
  saved: false,
};

export const AddAccountForm = () => {
  const [state, formAction, pending] = useActionState(
    addAccountAction,
    INITIAL,
  );

  return (
    <form
      action={formAction}
      aria-label="Añadir cuenta"
      className="mt-4 flex flex-wrap items-start gap-3"
    >
      <div className="w-64">
        <TextField
          label="Nombre"
          name="name"
          autoComplete="off"
          defaultValue={state.name}
          error={state.errors.name}
        />
      </div>
      <div className="w-48">
        <TextField
          label="Saldo inicial"
          name="openingBalance"
          inputMode="decimal"
          autoComplete="off"
          alignRight
          defaultValue={state.openingBalance}
          error={state.errors.openingBalance}
        />
      </div>
      <div className="pt-[26px]">
        <Button type="submit" variant="primary" disabled={pending}>
          Añadir cuenta
        </Button>
      </div>
    </form>
  );
};
