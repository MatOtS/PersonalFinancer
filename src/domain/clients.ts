// Rules for a client (work item 007). The form and the server both use them.
// The fiscal data is optional: empty is "no data", spaces around are removed.

export const MAX_CLIENT_NAME = 100;
export const MAX_TAX_ID = 30;
export const MAX_ADDRESS = 200;
export const MAX_EMAIL = 200;

export const EMPTY_CLIENT_NAME = "Introduce un nombre";
export const tooLong = (what: string, max: number, feminine = false) =>
  `${what} es demasiado ${feminine ? "larga" : "largo"} (máximo ${max} caracteres)`;

// What the form sends, all as text.
export type ClientInput = {
  name: string;
  taxId: string;
  address: string;
  email: string;
};

export type ClientErrors = Partial<Record<keyof ClientInput, string>>;

export type ValidClient = {
  name: string;
  taxId: string | null;
  address: string | null;
  email: string | null;
};

export type ClientCheck = { errors: ClientErrors } | { value: ValidClient };

const length = (text: string) => [...text].length;
const orNull = (text: string) => (text.trim() === "" ? null : text.trim());

export function validateClient(input: ClientInput): ClientCheck {
  const errors: ClientErrors = {};
  const name = input.name.trim();

  if (name === "") errors.name = EMPTY_CLIENT_NAME;
  else if (length(name) > MAX_CLIENT_NAME) {
    errors.name = tooLong("El nombre", MAX_CLIENT_NAME);
  }
  if (length(input.taxId.trim()) > MAX_TAX_ID) {
    errors.taxId = tooLong("El NIF", MAX_TAX_ID);
  }
  if (length(input.address.trim()) > MAX_ADDRESS) {
    errors.address = tooLong("La dirección", MAX_ADDRESS, true);
  }
  if (length(input.email.trim()) > MAX_EMAIL) {
    errors.email = tooLong("El email", MAX_EMAIL);
  }
  if (Object.keys(errors).length > 0) return { errors };

  return {
    value: {
      name,
      taxId: orNull(input.taxId),
      address: orNull(input.address),
      email: orNull(input.email),
    },
  };
}
