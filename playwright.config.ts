import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

// Playwright does not read .env files by itself (Next does, Playwright does not).
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const PORT = 3000;
const isCI = Boolean(process.env.CI);

// Optional: path of an installed Chromium-based browser, so none is downloaded.
const executablePath = process.env.PLAYWRIGHT_BROWSER_PATH;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    // The design is checked at desktop width (phase 1).
    viewport: { width: 1280, height: 800 },
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
        launchOptions: executablePath ? { executablePath } : {},
      },
    },
  ],
  webServer: {
    // CI tests the production build (strict CSP); locally the dev server is
    // reused if it is already running.
    command: isCI
      ? `npm run build && npm run start -- --port ${PORT}`
      : `npm run dev -- --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !isCI,
    timeout: 180_000,
  },
});
