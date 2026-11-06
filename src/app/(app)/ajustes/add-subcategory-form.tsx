"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { addSubcategoryAction, type CategoryFormState } from "./actions";

type AddSubcategoryFormProps = {
  parentId: string;
  parentName: string;
  // Closes the line (after saving, when the category is gone, or on cancel).
  onDone: () => void;
  // The message that belongs to no field; the list shows it in a fixed place
  // because this row may disappear when the list is refreshed.
  onNotice: (message: string | null) => void;
};

const INITIAL: CategoryFormState = {
  name: "",
  errors: {},
  message: null,
  saved: false,
};

export const AddSubcategoryForm = ({
  parentId,
  parentName,
  onDone,
  onNotice,
}: AddSubcategoryFormProps) => {
  const [state, formAction, pending] = useActionState(
    async (previous: CategoryFormState, formData: FormData) => {
      const next = await addSubcategoryAction(previous, formData);
      onNotice(next.message);
      if (next.saved || next.message) onDone();
      return next;
    },
    INITIAL,
  );

  return (
    <form
      action={formAction}
      aria-label={`Nueva subcategoría de ${parentName}`}
      className="flex flex-wrap items-start gap-3"
    >
      <input type="hidden" name="parentId" value={parentId} />
      <div className="w-64">
        <TextField
          label="Nombre"
          name="name"
          placeholder="Nueva subcategoría"
          // The button that opened this line is still there, but the user just
          // asked to type, so the focus goes straight to the field.
          autoFocus
          autoComplete="off"
          defaultValue={state.name}
          error={state.errors.name}
        />
      </div>
      <div className="flex gap-2 pt-[26px]">
        <Button type="submit" variant="primary" disabled={pending}>
          Añadir
        </Button>
        <Button variant="secondary" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  );
};
