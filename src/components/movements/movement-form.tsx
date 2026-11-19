"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import {
  createMovementAction,
  type MovementFormData,
  type MovementFormState,
} from "@/app/(app)/movement-actions";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import type { MovementInput } from "@/domain/movements";
import { categoryOptions, subcategoryOptions } from "./movement-form-options";

type MovementFormProps = MovementFormData & {
  // Today's date as yyyy-mm-dd: the date the form starts with.
  today: string;
  // Present when a saved movement is edited: what it starts with, the action
  // that saves it and its id (sent with the form).
  edit?: {
    id: string;
    initial: MovementInput;
    action: typeof createMovementAction;
  };
  onSaved: () => void;
  onCancel: () => void;
};

const KINDS = [
  { value: "expense", label: "Gasto" },
  { value: "income", label: "Ingreso" },
];
const WORK_KINDS = [
  { value: "personal", label: "Personal" },
  { value: "freelance", label: "Freelance" },
];

// The form to register a movement. Everything starts empty except the date.
// The fields are controlled so that a failed attempt keeps what was typed and
// clears only the choice that no longer exists.
export const MovementForm = ({
  accounts,
  categories,
  today,
  edit,
  onSaved,
  onCancel,
}: MovementFormProps) => {
  const [values, setValues] = useState<MovementInput>(
    edit?.initial ?? {
      kind: "",
      amount: "",
      date: today,
      accountId: "",
      workKind: "",
      description: "",
      categoryId: "",
      subcategoryId: "",
      isFixed: false,
    },
  );
  const set = <K extends keyof MovementInput>(
    key: K,
    value: MovementInput[K],
  ) => setValues((current) => ({ ...current, [key]: value }));

  const [state, formAction, pending] = useActionState(
    async (previous: MovementFormState, formData: FormData) => {
      const next = await (edit?.action ?? createMovementAction)(
        previous,
        formData,
      );
      if (next.saved) onSaved();
      else setValues(next.values);
      return next;
    },
    {
      values,
      errors: {},
      message: null,
      saved: false,
    } satisfies MovementFormState,
  );

  return (
    <form
      // Sent by hand: the `action` prop makes React reset the form after the
      // answer, which unchecks the radio buttons when there are errors.
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(() => formAction(data));
      }}
      aria-label={edit ? "Editar movimiento" : "Añadir movimiento"}
      className="mt-4 flex flex-col gap-4"
    >
      {edit && <input type="hidden" name="id" value={edit.id} />}
      {state.message && (
        <p role="alert" className="text-small text-negative">
          {state.message}
        </p>
      )}
      {accounts.length === 0 && (
        <p className="text-small text-text-muted">
          Aún no tienes cuentas.{" "}
          <Link
            href="/ajustes#cuentas"
            onClick={onCancel}
            className="font-semibold text-accent underline"
          >
            Añadir cuenta
          </Link>
        </p>
      )}

      <SegmentedControl
        name="kind"
        label="Tipo de movimiento"
        visibleLabel
        options={KINDS}
        value={values.kind}
        onChange={(kind) => set("kind", kind)}
        error={state.errors.kind}
      />

      <div className="grid grid-cols-2 gap-4">
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
        <TextField
          label="Fecha"
          type="date"
          name="date"
          value={values.date}
          // Clearing the date puts today back: a movement always has a date.
          onChange={(event) => set("date", event.target.value || today)}
        />
      </div>

      <TextField
        label="Descripción"
        name="description"
        autoComplete="off"
        value={values.description}
        onChange={(event) => set("description", event.target.value)}
        error={state.errors.description}
      />

      <SelectField
        label="Cuenta"
        name="accountId"
        options={accounts.map((account) => ({
          value: account.id,
          label: account.name,
        }))}
        value={values.accountId || null}
        onValueChange={(id) => set("accountId", id ?? "")}
        placeholder="Elige una cuenta"
        error={state.errors.account}
      />

      <div className="grid grid-cols-2 gap-4">
        <SelectField
          label="Categoría"
          name="categoryId"
          options={categoryOptions(categories)}
          value={values.categoryId || null}
          onValueChange={(id) =>
            // The subcategory belongs to the category: a new one clears it.
            setValues((current) => ({
              ...current,
              categoryId: id ?? "",
              subcategoryId: "",
            }))
          }
          placeholder="Elige una categoría"
        />
        <SelectField
          label="Subcategoría"
          name="subcategoryId"
          options={subcategoryOptions(categories, values.categoryId || null)}
          value={values.subcategoryId || null}
          onValueChange={(id) => set("subcategoryId", id ?? "")}
          placeholder="Elige una subcategoría"
          disabled={!values.categoryId}
        />
      </div>

      <SegmentedControl
        name="workKind"
        label="Personal o freelance"
        visibleLabel
        options={WORK_KINDS}
        value={values.workKind}
        onChange={(workKind) => set("workKind", workKind)}
        invalid={state.errors.workKind}
      />

      <label className="flex items-center gap-2 text-small font-semibold">
        <input
          type="checkbox"
          name="isFixed"
          checked={values.isFixed}
          onChange={(event) => set("isFixed", event.target.checked)}
        />
        Movimiento fijo
      </label>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" disabled={pending}>
          Guardar
        </Button>
      </div>
    </form>
  );
};
