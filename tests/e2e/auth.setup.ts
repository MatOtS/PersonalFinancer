import { test as setup } from "@playwright/test";
import { signInThroughForm } from "./support/sign-in";
import { userA, userAStatePath } from "./support/users";

// Runs once before the other tests: signs in as userA and saves the session.
// The tests then start already signed in, without using the sign-in limit.
setup("sign in as userA and save the session", async ({ page }) => {
  await signInThroughForm(page, userA);
  await page.context().storageState({ path: userAStatePath });
});
