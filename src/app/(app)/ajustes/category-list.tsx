"use client";

import { useActionState, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { CategoryGroups, Kind } from "@/data/categories";
import {
  countSubcategoriesAction,
  deleteCategoryAction,
  type DeleteCategoryState,
} from "./actions";
import { AddCategoryForm } from "./add-category-form";
import { AddSubcategoryForm } from "./add-subcategory-form";
import { EditCategoryForm } from "./edit-category-form";

const GROUPS: { kind: Kind; title: string }[] = [
  { kind: "expense", title: "Gastos" },
  { kind: "income", title: "Ingresos" },
];

type ToDelete = {
  id: string;
  parentId: string | null;
  name: string;
  // How many subcategories go with it; null when it is a subcategory.
  subcategories: number | null;
};

const CANNOT_UNDO = "Esta acción no se puede deshacer.";

// `subcategories` is null for a subcategory, and the count for a category.
export const deleteText = (name: string, subcategories: number | null) => {
  if (subcategories === null) {
    return {
      title: "¿Eliminar la subcategoría?",
      description: `Se eliminará la subcategoría "${name}". ${CANNOT_UNDO}`,
    };
  }
  const with_ =
    subcategories === 0
      ? ""
      : ` con ${subcategories} ${subcategories === 1 ? "subcategoría" : "subcategorías"}`;
  return {
    title: "¿Eliminar la categoría?",
    description: `Se eliminará la categoría "${name}"${with_}. ${CANNOT_UNDO}`,
  };
};

export const CategoryList = ({ groups }: { groups: CategoryGroups }) => {
  const [notice, setNotice] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<ToDelete | null>(null);
  const deleteForm = useRef<HTMLFormElement>(null);

  const [, deleteAction] = useActionState(
    async (previous: DeleteCategoryState, formData: FormData) => {
      const next = await deleteCategoryAction(previous, formData);
      setNotice(next.message);
      return next;
    },
    { message: null },
  );

  const edit = (id: string) => {
    setNotice(null);
    setAddingTo(null);
    setEditingId(id);
  };

  // The number is asked now, not read from the list: with two tabs open the
  // list can be stale.
  const askToDeleteCategory = async (id: string, name: string) => {
    setNotice(null);
    const subcategories = await countSubcategoriesAction(id);
    setToDelete({ id, parentId: null, name, subcategories });
  };

  const text = toDelete
    ? deleteText(toDelete.name, toDelete.subcategories)
    : { title: "", description: "" };

  return (
    <div className="mt-6">
      {/* Always in the page, so a screen reader announces what appears in it. */}
      <p role="alert" className="mb-2 min-h-5 text-small text-negative">
        {notice}
      </p>

      {GROUPS.map(({ kind, title }) => (
        <div key={kind} className="mb-8 last:mb-0">
          <h3 className="text-body font-semibold">{title}</h3>
          <AddCategoryForm kind={kind} />
          <ul className="mt-2">
            {groups[kind].map((category) => (
              <li
                key={category.id}
                className="border-b border-border py-3 last:border-b-0"
              >
                {editingId === category.id ? (
                  <EditCategoryForm
                    id={category.id}
                    parentId={null}
                    name={category.name}
                    onDone={() => setEditingId(null)}
                    onNotice={setNotice}
                  />
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-semibold">{category.name}</span>
                    <span className="ml-auto flex gap-1">
                      <Button
                        variant="ghost"
                        aria-label={`Añadir subcategoría a ${category.name}`}
                        onClick={() => {
                          setNotice(null);
                          setEditingId(null);
                          setAddingTo(category.id);
                        }}
                      >
                        Añadir subcategoría
                      </Button>
                      <Button
                        variant="ghost"
                        aria-label={`Editar ${category.name}`}
                        onClick={() => edit(category.id)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost-destructive"
                        aria-label={`Eliminar ${category.name}`}
                        onClick={() =>
                          askToDeleteCategory(category.id, category.name)
                        }
                      >
                        Eliminar
                      </Button>
                    </span>
                  </div>
                )}

                {category.subcategories.length > 0 && (
                  <ul className="mt-2 ml-6">
                    {category.subcategories.map((sub) => (
                      <li key={sub.id} className="py-1.5">
                        {editingId === sub.id ? (
                          <EditCategoryForm
                            id={sub.id}
                            parentId={category.id}
                            name={sub.name}
                            onDone={() => setEditingId(null)}
                            onNotice={setNotice}
                          />
                        ) : (
                          <div className="flex items-center gap-3">
                            <span>{sub.name}</span>
                            <span className="ml-auto flex gap-1">
                              <Button
                                variant="ghost"
                                aria-label={`Editar ${sub.name}`}
                                onClick={() => edit(sub.id)}
                              >
                                Editar
                              </Button>
                              <Button
                                variant="ghost-destructive"
                                aria-label={`Eliminar ${sub.name}`}
                                onClick={() => {
                                  setNotice(null);
                                  setToDelete({
                                    id: sub.id,
                                    parentId: category.id,
                                    name: sub.name,
                                    subcategories: null,
                                  });
                                }}
                              >
                                Eliminar
                              </Button>
                            </span>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {addingTo === category.id && (
                  <div className="mt-2 ml-6">
                    <AddSubcategoryForm
                      parentId={category.id}
                      parentName={category.name}
                      onDone={() => setAddingTo(null)}
                      onNotice={setNotice}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}

      <form ref={deleteForm} action={deleteAction}>
        <input type="hidden" name="id" value={toDelete?.id ?? ""} />
        <input type="hidden" name="parentId" value={toDelete?.parentId ?? ""} />
      </form>
      <ConfirmDialog
        open={toDelete !== null}
        title={text.title}
        description={text.description}
        confirmLabel="Eliminar"
        onConfirm={() => {
          // The form reads the hidden fields when it is submitted; the state
          // change below is only applied after this handler ends.
          deleteForm.current?.requestSubmit();
          setToDelete(null);
        }}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
};
