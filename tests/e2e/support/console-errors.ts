import { expect, type Page } from "@playwright/test";

// NFR console: a page shows zero errors. `watchConsole` starts listening (call
// it before the page does anything) and `expectNoConsoleErrors` fails the test
// if the page wrote an error or threw. The policy violations are errors too.
const errorsOf = new WeakMap<Page, string[]>();

export function watchConsole(page: Page) {
  const errors: string[] = [];
  errorsOf.set(page, errors);
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
}

export function expectNoConsoleErrors(page: Page) {
  expect(errorsOf.get(page) ?? []).toEqual([]);
}
