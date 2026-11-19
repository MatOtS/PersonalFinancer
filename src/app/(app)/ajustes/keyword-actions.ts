"use server";

import { revalidatePath } from "next/cache";
import { createKeyword } from "@/data/keywords";
import { validateKeyword } from "@/domain/categorize";

export type KeywordFormState = {
  values: { keyword: string; categoryId: string };
  errors: { keyword?: string; category?: string };
  message: string | null;
  saved: boolean;
};

const text = (value: FormDataEntryValue | null) =>
  typeof value === "string" ? value : "";

export async function addKeywordAction(
  _previousState: KeywordFormState,
  formData: FormData,
): Promise<KeywordFormState> {
  const values = {
    keyword: text(formData.get("keyword")),
    categoryId: text(formData.get("categoryId")),
  };
  const check = validateKeyword(values.keyword, values.categoryId);
  if ("errors" in check) {
    return { values, errors: check.errors, message: null, saved: false };
  }

  const result = await createKeyword(check.keyword, check.categoryId);
  if (!result.ok) {
    return { values, errors: {}, message: result.error, saved: false };
  }
  revalidatePath("/ajustes");
  revalidatePath("/importar");
  return {
    values: { keyword: "", categoryId: values.categoryId },
    errors: {},
    message: null,
    saved: true,
  };
}
