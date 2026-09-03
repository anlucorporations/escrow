// =============================================================================
// TrueKeate — E2E Landing (Fase 4)
// Valida la landing pública (RF-14.1): hero con marca, "qué es un Trueke",
// métricas, ventajas, filosofía y CTA a la suite.
// =============================================================================
import { test, expect } from "@playwright/test";

test.describe("Landing pública (RF-14.1)", () => {
  test("muestra el hero con la marca y el titular", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Intercambio Descentralizado");
    // assets de marca (RF-19): logo SVG presente
    await expect(page.locator('img[alt="TrueKeate logo"]')).toBeVisible();
    await expect(page.locator('img[alt="TrueKeate"]')).toBeVisible();
  });

  test("incluye las métricas de la plataforma", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Usuarios")).toBeVisible();
    await expect(page.getByText("Truekes")).toBeVisible();
    await expect(page.getByText("Volumen")).toBeVisible();
  });

  test("muestra las ventajas del Trueke Digital", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Custodia atómica" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Trueke sin gas" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Reputación real" })).toBeVisible();
  });

  test("el CTA navega a la suite (sin wallet el guard pide conectar)", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Entrar a la suite" }).click();
    await expect(page).toHaveURL(/\/suite\/dashboard/);
    // Sin billetera conectada, el público no accede al contenido privado:
    await expect(page.getByText("Conecta tu billetera para continuar")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Mi Trueke Central" })).toHaveCount(0);
  });
});
