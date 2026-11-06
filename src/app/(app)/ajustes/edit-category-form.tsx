"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { renameCategoryAction, type CategoryFormState } from "./actions";

type EditCategoryFormProps = {
  id: string;
  // Null for a category, the id of its category for a subcategory.
  parentId: string | null;
  name: string;
  // Closes the form (after saving, or when the element is gone).
  onDone: () => void;
  // The message that belongs to no field; the list shows it in a fixed place
  // because this row may disappear when the list is refreshed.
  onNotice: (message: string | null) => void;
};

// Only the name can change: the type of a category is chosen when it is added.
export const EditCategoryForm = ({
  id,
  parentId,
  name,
  onDone,
  onNotice,
}: EditCategoryFormProps) => {
  const initial: CategoryFormState = {
    name,
    errors: {},
    message: null,
    saved: false,
  };
  const [state, formAction, pending] = useActionState(
    async (previous: CategoryFormState, formData: FormData) => {
      const next = await renameCategoryAction(previous, formData);
      onNotice(next.message);
      if (next.saved || next.message) onDone();
      return next;
    },
    initial,
  );

  return (
    <form
      action={formAction}
      aria-label={`Editar ${name}`}
      className="flex flex-wrap items-start gap-3"
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="parentId" value={parentId ?? ""} />
      <div className="w-64">
        <TextField
          label="Nombre"
          name="name"
          // The "Editar" button that opened this form is gone, so the focus
          // would be lost; it starts on the field instead.
          autoFocus
          autoComplete="off"
          defaultValue={state.name}
          error={state.errors.name}
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
