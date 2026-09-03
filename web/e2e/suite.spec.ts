// =============================================================================
// TrueKeate — E2E Suite: control de acceso (decisión del director)
//   1) Sin billetera conectada → la suite está bloqueada (solo la landing es
//      pública): se muestra la pantalla "Conecta tu billetera".
//   2) Wallet conectada pero NO inscrita → solo catálogo (/suite/mercado) y
//      botón de inscripción en el menú de usuario.
//   3) Wallet inscrita → dashboard con escalera D28 según estado real.
// =============================================================================
import { test, expect, type Page } from "@playwright/test";

const CUENTA = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";

/** Inyecta una wallet simulada (MetaMask mock) y el estado de inscripción. */
async function simularWallet(page: Page, inscrito: boolean, estado = "INSCRITO") {
  await page.addInitScript(
    ([cuenta, est, estadoInicial]) => {
      let estaInscrito = Boolean(est);

      // Wallet simulada (RF-16): expone eth_requestAccounts / accountsChanged.
      (window as unknown as Record<string, unknown>).ethereum = {
        isMetaMask: true,
        request: async ({ method }: { method: string }) => {
          if (method === "eth_requestAccounts" || method === "eth_accounts") return [cuenta];
          if (method === "eth_chainId") return "0x7a69";
          if (method === "net_version") return "31337";
          return null;
        },
        on: () => {},
        removeListener: () => {},
      };
      localStorage.setItem("truekeate.account", cuenta as string);

      // Intercepta la verificación de inscripción contra el backend.
      const origFetch = window.fetch.bind(window);
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/auth/estado")) {
          return new Response(
            JSON.stringify(
              estaInscrito
                ? {
                    inscrito: true,
                    usuario: {
                      wallet: cuenta,
                      tipo: "PARTICULAR",
                      nivel: "INICIADO",
                      estado: estadoInicial ?? "INSCRITO",
                    },
                  }
                : { inscrito: false, usuario: null }
            ),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        if (url.includes("/auth/register") && init?.method === "POST") {
          estaInscrito = true; // el registro formal deja la wallet inscrita
          return new Response(
            JSON.stringify({
              inscrito: true,
              usuario: { wallet: cuenta, tipo: "PARTICULAR", nivel: "INICIADO", estado: "INSCRITO" },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        if (url.includes("/catalog") && !init?.method) {
          return new Response(
            JSON.stringify({
              articulos: [
                { id: 1, titulo: "Bicicleta de montaña", rubro: "Deportes", disponible: true },
                { id: 2, titulo: "Curso de fotografía", rubro: "Educacion", disponible: true },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        return origFetch(input, init);
      };
    },
    [CUENTA, inscrito ? estado : null, estado] as unknown as string[]
  );
}

test.describe("Suite de usuario — control de acceso", () => {
  test("sin billetera: el público NO accede a la suite (solo landing)", async ({ page }) => {
    await page.goto("/suite/dashboard");
    await expect(page.getByText("Conecta tu billetera para continuar")).toBeVisible();
    await expect(page.getByRole("button", { name: "Conectar MetaMask" })).toBeVisible();
    // El contenido privado NO se muestra
    await expect(page.getByRole("heading", { name: "Mi Trueke Central" })).toHaveCount(0);
  });

  test("wallet conectada sin inscribir: SOLO puede ver el catálogo", async ({ page }) => {
    await simularWallet(page, false);
    await page.goto("/suite/dashboard");
    // El dashboard está bloqueado: pide inscripción
    await expect(page.getByText("Completa tu inscripción para usar la suite")).toBeVisible();

    // Navega al catálogo (acceso permitido) y ve las ofertas
    await page.goto("/suite/mercado");
    await expect(page.getByRole("heading", { name: "Mercado de trueques" })).toBeVisible();
    await expect(page.getByText("Bicicleta de montaña")).toBeVisible();
    await expect(page.getByText("Curso de fotografía")).toBeVisible();
  });

  test("wallet inscrita (INSCRITO): ve el dashboard con la escalera D28", async ({ page }) => {
    await simularWallet(page, true, "INSCRITO");
    await page.goto("/suite/dashboard");
    await expect(page.getByRole("heading", { name: "Mi Trueke Central" })).toBeVisible();

    const escalera = page.getByRole("list");
    await expect(escalera.getByText("INSCRITO")).toBeVisible();
    await expect(escalera.getByText("VERIFICADO")).toBeVisible();
    await expect(escalera.getByText("CERTIFICADO")).toBeVisible();

    // módulo "Mis truekes" atenuado para Inscrito (RF-14.3/D28)
    const modulo = page.locator("h3", { hasText: "Mis truekes" }).locator("..");
    await expect(modulo).toHaveClass(/opacity-50/);
  });

  test("menú de usuario: wallet no inscrita muestra el botón de inscripción", async ({ page }) => {
    await simularWallet(page, false);
    await page.goto("/suite/dashboard");
    await page.getByRole("button", { name: "Menú de usuario" }).click();
    await expect(page.getByText("Aún no estás inscrito en TrueKeate.")).toBeVisible();
    await expect(page.getByRole("link", { name: /Completar inscripción/ })).toBeVisible();
  });

  test("la página de inscripción permite inscribirse formalmente", async ({ page }) => {
    await simularWallet(page, false);
    await page.goto("/suite/inscripcion");
    await expect(page.getByRole("heading", { name: "Inscripción en TrueKeate" })).toBeVisible();
    await page.getByLabel("Correo electrónico *").fill("ana@truekeate.test");
    await page.getByLabel("Teléfono *").fill("+58 412 000 0000");
    await page.getByLabel(/Autorizo a TrueKeate/).check();
    await page.getByRole("button", { name: "Completar inscripción" }).click();
    // Tras inscribirse, la wallet queda inscrita y accede al dashboard.
    await expect(page).toHaveURL(/\/suite\/dashboard/, { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "Mi Trueke Central" })).toBeVisible();
  });

  test("la navegación inferior móvil tiene el botón central hexagonal", async ({ page }) => {
    await page.goto("/suite/mercado");
    const central = page.getByRole("link", { name: "Trueke" });
    await expect(central).toBeVisible();
    await expect(page.getByRole("link", { name: "Mercado" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Perfil" })).toBeVisible();
  });
});
