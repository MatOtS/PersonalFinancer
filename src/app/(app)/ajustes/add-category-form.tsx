"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import type { Kind } from "@/data/categories";
import { addCategoryAction, type CategoryFormState } from "./actions";

const INITIAL: CategoryFormState = {
  name: "",
  errors: {},
  message: null,
  saved: false,
};

const LABELS: Record<Kind, string> = {
  expense: "Añadir categoría de gasto",
  income: "Añadir categoría de ingreso",
};

// One form per group: the group is what tells the type of the new category.
export const AddCategoryForm = ({ kind }: { kind: Kind }) => {
  const [state, formAction, pending] = useActionState(
    addCategoryAction,
    INITIAL,
  );

  return (
    <form
      action={formAction}
      aria-label={LABELS[kind]}
      className="mt-3 flex flex-wrap items-start gap-3"
    >
      <input type="hidden" name="kind" value={kind} />
      <div className="w-64">
        <TextField
          label="Nombre"
          name="name"
          placeholder="Nueva categoría"
          autoComplete="off"
          defaultValue={state.name}
          error={state.errors.name}
        />
      </div>
      <div className="pt-[26px]">
        <Button type="submit" variant="primary" disabled={pending}>
          Añadir categoría
        </Button>
      </div>
    </form>
  );
};
