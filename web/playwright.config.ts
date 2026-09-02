import { defineConfig, devices } from "@playwright/test";

/**
 * TrueKeate — Playwright E2E (Fase 4)
 * Prueba la landing pública (RF-14.1) y la suite por rol (RF-14.2-14.8).
 * El frontend se sirve con `npm run dev` (o el build con `npm start`) en :3000.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: true,
  retries: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: process.env.BASE_URL || "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chrome", use: { ...devices["Pixel 5"] } }, // móvil-first (RNF-02.3)
  ],
  webServer: {
    command: "npm run start",
    port: 3000,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
