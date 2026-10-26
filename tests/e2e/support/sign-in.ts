import { expect, type Page } from "@playwright/test";
import type { userA } from "./users";

// Signs in through the real form and waits until the app leaves the sign-in
// page. Use it only where the sign-in itself is part of the test, or where a
// test needs its own session (signing out would end a shared one): the local
// authentication service allows 30 sign-ins every 5 minutes per IP.
export async function signInThroughForm(
  page: Page,
  user: typeof userA,
  next?: string,
) {
  await page.goto(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Contraseña").fill(user.password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}
