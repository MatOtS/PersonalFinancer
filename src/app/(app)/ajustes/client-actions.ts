"use server";

import { revalidatePath } from "next/cache";
import { createClientRecord, updateClientRecord } from "@/data/clients";
import {
  validateClient,
  type ClientErrors,
  type ClientInput,
} from "@/domain/clients";

export type ClientFormState = {
  values: ClientInput;
  errors: ClientErrors;
  message: string | null;
  saved: boolean;
};

const text = (value: FormDataEntryValue | null) =>
  typeof value === "string" ? value : "";

const readForm = (formData: FormData): ClientInput => ({
  name: text(formData.get("name")),
  taxId: text(formData.get("taxId")),
  address: text(formData.get("address")),
  email: text(formData.get("email")),
});

const EMPTY: ClientInput = { name: "", taxId: "", address: "", email: "" };

export async function addClientAction(
  _previousState: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const values = readForm(formData);
  const check = validateClient(values);
  if ("errors" in check) {
    return { values, errors: check.errors, message: null, saved: false };
  }
  await createClientRecord(check.value);
  revalidatePath("/ajustes");
  return { values: EMPTY, errors: {}, message: null, saved: true };
}

export async function updateClientAction(
  _previousState: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const values = readForm(formData);
  const check = validateClient(values);
  if ("errors" in check) {
    return { values, errors: check.errors, message: null, saved: false };
  }
  const result = await updateClientRecord(
    text(formData.get("id")),
    check.value,
  );
  // Also when it was gone: the list must stop showing it.
  revalidatePath("/ajustes");
  if (!result.ok) {
    return { values, errors: {}, message: result.error, saved: false };
  }
  return { values, errors: {}, message: null, saved: true };
}
