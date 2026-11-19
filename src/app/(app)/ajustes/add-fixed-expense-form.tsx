"use client";

import { startTransition, useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { categoryOptions } from "@/components/movements/movement-form-options";
import type { Account } from "@/data/accounts";
import type { CategoryGroups } from "@/data/categories";
import { FREQUENCIES, type FixedExpenseInput } from "@/domain/fixed-expenses";
import {
  addFixedExpenseAction,
  type FixedExpenseFormState,
} from "./fixed-expense-actions";

const EMPTY: FixedExpenseInput = {
  name: "",
  amount: "",
  frequency: "",
  accountId: "",
  categoryId: "",
};

type Props = { accounts: Account[]; categories: CategoryGroups };

// Controlled fields, sent by hand (not with the `action` prop): React resets a
// form sent through `action`, which would clear the choices of the lists.
export const AddFixedExpenseForm = ({ accounts, categories }: Props) => {
  const [values, setValues] = useState<FixedExpenseInput>(EMPTY);
  const set = <K extends keyof FixedExpenseInput>(
    key: K,
    value: FixedExpenseInput[K],
  ) => setValues((current) => ({ ...current, [key]: value }));

  const [state, formAction, pending] = useActionState(
    async (previous: FixedExpenseFormState, formData: FormData) => {
      const next = await addFixedExpenseAction(previous, formData);
      setValues(next.values);
      return next;
    },
    { values: EMPTY, errors: {}, message: null, saved: false },
  );

  return (
    <form
      aria-label="Añadir gasto fijo"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(() => formAction(data));
      }}
      className="mt-4 flex flex-wrap items-start gap-3"
    >
      {state.message && (
        <p role="alert" className="w-full text-small text-negative">
          {state.message}
        </p>
      )}
      <div className="w-56">
        <TextField
          label="Nombre"
          name="name"
          autoComplete="off"
          value={values.name}
          onChange={(event) => set("name", event.target.value)}
          error={state.errors.name}
        />
      </div>
      <div className="w-36">
        <TextField
          label="Importe"
          name="amount"
          inputMode="decimal"
          autoComplete="off"
          alignRight
          value={values.amount}
          onChange={(event) => set("amount", event.target.value)}
          error={state.errors.amount}
        />
      </div>
      <div className="w-40">
        <SelectField
          label="Frecuencia"
          name="frequency"
          options={FREQUENCIES}
          value={values.frequency || null}
          onValueChange={(value) => set("frequency", value ?? "")}
          placeholder="Frecuencia del gasto"
          error={state.errors.frequency}
        />
      </div>
      <div className="w-48">
        <SelectField
          label="Cuenta (opcional)"
          name="accountId"
          options={accounts.map((a) => ({ value: a.id, label: a.name }))}
          value={values.accountId || null}
          onValueChange={(value) => set("accountId", value ?? "")}
          placeholder="Sin cuenta"
        />
      </div>
      <div className="w-48">
        <SelectField
          label="Categoría (opcional)"
          name="categoryId"
          options={categoryOptions(categories)}
          value={values.categoryId || null}
          onValueChange={(value) => set("categoryId", value ?? "")}
          placeholder="Sin categoría"
        />
      </div>
      <div className="pt-[26px]">
        <Button type="submit" variant="primary" disabled={pending}>
          Añadir gasto fijo
        </Button>
      </div>
    </form>
  );
};
