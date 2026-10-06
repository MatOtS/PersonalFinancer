import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Unit tests live next to the code they test. Browser tests (Playwright)
    // live in tests/e2e and are not run by Vitest.
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    environment: "node",
  },
});
