// Rules for the logo of the issuer (work item 009): a png or a jpg that is not
// big. The PDF cannot embed other formats (ADR-23).

export const MAX_LOGO_BYTES = 512 * 1024;

export const LOGO_WRONG_TYPE = "El logo debe ser una imagen png o jpg";
export const LOGO_TOO_BIG = "El logo es demasiado grande (máximo 512 KB)";
export const LOGO_MISSING = "Elige un archivo";

export type LogoType = "image/png" | "image/jpeg";

export function validateLogo(
  type: string,
  size: number,
): { error: string } | { type: LogoType; extension: "png" | "jpg" } {
  if (size === 0) return { error: LOGO_MISSING };
  if (type !== "image/png" && type !== "image/jpeg") {
    return { error: LOGO_WRONG_TYPE };
  }
  if (size > MAX_LOGO_BYTES) return { error: LOGO_TOO_BIG };
  return { type, extension: type === "image/png" ? "png" : "jpg" };
}
