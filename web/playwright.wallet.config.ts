import { defineConfig } from "@playwright/test";

/**
 * Configuración E2E de la WALLET NATIVA (extensión).
 *
 * A diferencia de `playwright.config.ts` (suite web), estos casos cargan la
 * extensión desempaquetada en un contexto persistente, por lo que:
 *   - no usan el fixture `page` por defecto (cada caso lanza su navegador);
 *   - se ejecutan en serie (workers: 1);
 *   - apuntan a BASE_URL (por defecto, la plataforma desplegada).
 *
 * Requiere `wallet-extension/dist` construido (`npm run build`).
 * Uso:  npm run test:wallet        (desde web/)
 */
export default defineConfig({
  testDir: "./e2e-wallet",
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report-wallet" }]],
  use: {
    baseURL:
      process.env.BASE_URL || "https://truekeate-web-593453426217.europe-west1.run.app",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
