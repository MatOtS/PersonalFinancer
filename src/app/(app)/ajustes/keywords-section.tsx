"use client";

import { startTransition, useActionState, useState } from "react";
import { categoryOptions } from "@/components/movements/movement-form-options";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import type { CategoryGroups } from "@/data/categories";
import type { KeywordRecord } from "@/data/keywords";
import { addKeywordAction, type KeywordFormState } from "./keyword-actions";

type Props = { keywords: KeywordRecord[]; categories: CategoryGroups };

// The words that give a category to a movement when its description contains
// them, in the import. They are added here (a word is not changed or deleted:
// the previous app did not either).
export const KeywordsSection = ({ keywords, categories }: Props) => {
  const [values, setValues] = useState({ keyword: "", categoryId: "" });
  const [state, formAction, pending] = useActionState(
    async (previous: KeywordFormState, formData: FormData) => {
      const next = await addKeywordAction(previous, formData);
      setValues(next.values);
      return next;
    },
    {
      values,
      errors: {},
      message: null,
      saved: false,
    } satisfies KeywordFormState,
  );
  const names = new Map(
    [...categories.expense, ...categories.income].map((c) => [c.id, c.name]),
  );

  return (
    <section
      id="palabras"
      aria-labelledby="palabras-title"
      className="mt-6 rounded-lg border border-border bg-surface p-6 shadow-card"
    >
      <h2 id="palabras-title" className="text-h2 font-semibold">
        Palabras para categorizar
      </h2>
      <p className="mt-1 text-small text-text-muted">
        Al importar, si la descripción de un movimiento contiene la palabra, se
        le pone la categoría. Gana la primera palabra que coincide.
      </p>
      <form
        aria-label="Añadir palabra"
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
            label="Palabra"
            name="keyword"
            autoComplete="off"
            value={values.keyword}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                keyword: event.target.value,
              }))
            }
            error={state.errors.keyword}
          />
        </div>
        <div className="w-56">
          <SelectField
            label="Categoría"
            name="categoryId"
            options={categoryOptions(categories)}
            value={values.categoryId || null}
            onValueChange={(id) =>
              setValues((current) => ({ ...current, categoryId: id ?? "" }))
            }
            placeholder="Categoría de la palabra"
            error={state.errors.category}
          />
        </div>
        <div className="pt-[26px]">
          <Button type="submit" variant="primary" disabled={pending}>
            Añadir palabra
          </Button>
        </div>
      </form>
      {keywords.length === 0 ? (
        <p className="mt-6 text-small text-text-muted">
          Aún no tienes palabras.
        </p>
      ) : (
        <ul className="mt-6">
          {keywords.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 border-b border-border py-2 last:border-b-0"
            >
              <span className="font-semibold">{item.keyword}</span>
              <span className="text-small text-text-muted">
                {names.get(item.categoryId) ?? ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
