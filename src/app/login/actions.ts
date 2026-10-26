"use server";

import { redirect } from "next/navigation";
import { getSignedInUser, signIn } from "@/data/auth";
import { normalizeEmail } from "@/domain/auth/normalize-email";
import { safeReturnPath } from "@/domain/auth/safe-return-path";
import { signInErrorMessage } from "@/domain/auth/sign-in-error";
import {
  validateSignIn,
  type SignInErrors,
} from "@/domain/auth/validate-sign-in";

export type SignInState = {
  // What the user typed, so a failed attempt keeps it (FR-6). The password is
  // never sent back.
  email: string;
  errors: SignInErrors;
  message: string | null;
};

const text = (value: FormDataEntryValue | null) =>
  typeof value === "string" ? value : "";

export async function signInAction(
  _previousState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  // A form that was already open in another tab, submitted after signing in:
  // the typed credentials are ignored and the user lands on Home (FR-12).
  if (await getSignedInUser()) redirect("/");

  const typedEmail = text(formData.get("email"));
  const password = text(formData.get("password"));
  const email = normalizeEmail(typedEmail);

  // The browser already checked this (FR-9); the server repeats it because the
  // browser can be skipped.
  const errors = validateSignIn({ email, password });
  if (errors.email || errors.password) {
    return { email: typedEmail, errors, message: null };
  }

  const result = await signIn(email, password);
  if (!result.ok) {
    return {
      email: typedEmail,
      errors: {},
      message: signInErrorMessage(result.failure),
    };
  }

  // The return path comes from the address bar, so it is checked again here.
  redirect(safeReturnPath(text(formData.get("next"))));
}
