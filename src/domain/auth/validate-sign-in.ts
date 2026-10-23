import { normalizeEmail } from "./normalize-email";

export type SignInInput = { email: string; password: string };
export type SignInErrors = { email?: string; password?: string };

// The email is empty once its spaces are removed. The password is only empty
// if it has no characters at all: it is sent exactly as typed, so a password
// made of spaces is a real password.
export function validateSignIn({ email, password }: SignInInput): SignInErrors {
  const errors: SignInErrors = {};
  if (normalizeEmail(email) === "") errors.email = "Introduce tu email";
  if (password === "") errors.password = "Introduce tu contraseña";
  return errors;
}
