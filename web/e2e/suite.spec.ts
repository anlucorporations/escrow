// =============================================================================
// TrueKeate — E2E Suite por rol (Fase 4)
// Valida la suite (RF-14.2): barra superior @username, escalera de verificación
// D28 y módulos según estado (RF-14.3-14.5). La escalera se muestra con el
// estado actual; los módulos bloqueados aparecen atenuados.
// =============================================================================
import { test, expect } from "@playwright/test";

test.describe("Suite de usuario (RF-14.2)", () => {
  test("muestra la barra superior con @username y check (RNF-08.4)", async ({ page }) => {
    await page.goto("/suite/dashboard");
    await expect(page.getByText("TrueKeat☑")).toBeVisible();
    await expect(page.getByText("@usuario")).toBeVisible();
  });

  test("muestra la escalera de verificación D28", async ({ page }) => {
    await page.goto("/suite/dashboard");
    // La escalera es el <ol>; "INSCRITO" también figura en el badge de estado actual.
    const escalera = page.getByRole("list");
    await expect(escalera.getByText("INSCRITO")).toBeVisible();
    await expect(escalera.getByText("VERIFICADO")).toBeVisible();
    await expect(escalera.getByText("CERTIFICADO")).toBeVisible();
  });

  test("el estado INSCRITO no puede crear trueques (RF-14.3/D28)", async ({ page }) => {
    await page.goto("/suite/dashboard");
    // módulo "Mis truekes" aparece atenuado (opacity-50) para Inscrito
    const modulo = page.locator("h3", { hasText: "Mis truekes" }).locator("..");
    await expect(modulo).toHaveClass(/opacity-50/);
    await expect(page.getByText("Requiere estado Verificado.")).toBeVisible();
  });

  test("muestra el botón Conectar MetaMask cuando no hay sesión (RF-16)", async ({ page }) => {
    await page.goto("/suite/dashboard");
    await expect(page.getByRole("button", { name: "Conectar MetaMask" })).toBeVisible();
  });

  test("la navegación inferior móvil tiene el botón central hexagonal", async ({ page }) => {
    await page.goto("/suite/dashboard");
    const central = page.getByRole("link", { name: "Trueke" });
    await expect(central).toBeVisible();
    await expect(page.getByRole("link", { name: "Perfil" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Mercado" })).toBeVisible();
  });
});
