"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import type { Account } from "@/data/accounts";
import { formatCents } from "@/domain/money";
import { updateAccountAction, type AccountFormState } from "./actions";

type EditAccountFormProps = {
  account: Account;
  // Closes the form (after saving, or when the account is gone).
  onDone: () => void;
  // The message that belongs to no field; the list shows it in a fixed place
  // because this row may disappear when the list is refreshed.
  onNotice: (message: string | null) => void;
};

export const EditAccountForm = ({
  account,
  onDone,
  onNotice,
}: EditAccountFormProps) => {
  const initial: AccountFormState = {
    name: account.name,
    // The editable text has no " €": `parseAmount` does not accept it.
    openingBalance: formatCents(account.openingBalanceCents).replace(/ €$/, ""),
    errors: {},
    message: null,
    saved: false,
  };
  const [state, formAction, pending] = useActionState(
    async (previous: AccountFormState, formData: FormData) => {
      const next = await updateAccountAction(previous, formData);
      onNotice(next.message);
      if (next.saved || next.message) onDone();
      return next;
    },
    initial,
  );

  return (
    <form
      action={formAction}
      aria-label={`Editar ${account.name}`}
      className="flex flex-wrap items-start gap-3"
    >
      <input type="hidden" name="id" value={account.id} />
      <div className="w-64">
        <TextField
          label="Nombre"
          name="name"
          // The "Editar" button that opened this form is gone, so the focus
          // would be lost; it starts on the first field instead.
          autoFocus
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
      <div className="flex gap-2 pt-[26px]">
        <Button type="submit" variant="primary" disabled={pending}>
          Guardar
        </Button>
        <Button variant="secondary" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  );
};
