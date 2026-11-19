"use server";

import { revalidatePath } from "next/cache";
import { saveBilling, saveIssuer } from "@/data/invoices";
import { saveLogo } from "@/data/logo";
import {
  validateBilling,
  validateIssuer,
  type BillingErrors,
  type BillingInput,
  type IssuerErrors,
  type IssuerInput,
} from "@/domain/invoices";

export type IssuerFormState = {
  values: IssuerInput;
  errors: IssuerErrors;
  saved: boolean;
};
export type BillingFormState = {
  values: BillingInput;
  errors: BillingErrors;
  saved: boolean;
};

const text = (value: FormDataEntryValue | null) =>
  typeof value === "string" ? value : "";

export async function saveIssuerAction(
  _previousState: IssuerFormState,
  formData: FormData,
): Promise<IssuerFormState> {
  const values: IssuerInput = {
    name: text(formData.get("name")),
    taxId: text(formData.get("taxId")),
    phone: text(formData.get("phone")),
    address: text(formData.get("address")),
    email: text(formData.get("email")),
    iban: text(formData.get("iban")),
  };
  const check = validateIssuer(values);
  if ("errors" in check) return { values, errors: check.errors, saved: false };
  await saveIssuer(check.issuer);
  revalidatePath("/ajustes");
  return { values, errors: {}, saved: true };
}

export async function saveBillingAction(
  _previousState: BillingFormState,
  formData: FormData,
): Promise<BillingFormState> {
  const values: BillingInput = {
    irpf: text(formData.get("irpf")),
    iva: text(formData.get("iva")),
    numberFormat: text(formData.get("numberFormat")),
    numberNext: text(formData.get("numberNext")),
    dueDays: text(formData.get("dueDays")),
  };
  const check = validateBilling(values);
  if ("errors" in check) return { values, errors: check.errors, saved: false };
  await saveBilling(check.billing);
  revalidatePath("/ajustes");
  return { values, errors: {}, saved: true };
}

export type LogoFormState = { error: string | null; saved: boolean };

export async function uploadLogoAction(
  _previousState: LogoFormState,
  formData: FormData,
): Promise<LogoFormState> {
  const file = formData.get("logo");
  if (!(file instanceof File))
    return { error: "Elige un archivo", saved: false };
  const result = await saveLogo({
    type: file.type,
    size: file.size,
    bytes: await file.arrayBuffer(),
  });
  if (!result.ok) return { error: result.error, saved: false };
  revalidatePath("/ajustes");
  return { error: null, saved: true };
}
