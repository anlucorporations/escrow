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

interface UsuarioSim {
  tipo: "PARTICULAR" | "EMPRESA" | "SOCIO";
  nivel: "INICIADO" | "COMUN" | "FRECUENTE" | "SOCIO";
  estado: "INSCRITO" | "VERIFICADO" | "CERTIFICADO";
}

/** Inyecta una wallet simulada (MetaMask mock) y el estado de inscripción. */
async function simularWallet(
  page: Page,
  inscrito: boolean,
  usuario: UsuarioSim = { tipo: "PARTICULAR", nivel: "INICIADO", estado: "INSCRITO" }
) {
  await page.addInitScript(
    ([cuenta, est, usr]) => {
      let estaInscrito = Boolean(est);
      const usuarioSim = usr as unknown as UsuarioSim;

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
                    usuario: { wallet: cuenta, ...usuarioSim },
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
              usuario: { wallet: cuenta, ...usuarioSim },
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
    [CUENTA, inscrito ? true : null, usuario] as unknown as string[]
  );
}

test.describe("Suite de usuario — control de acceso", () => {
  test("sin billetera: el público NO accede a la suite (solo landing)", async ({ page }) => {
    await page.goto("/suite/dashboard");
    await expect(page.getByText("Conecta tu billetera para continuar")).toBeVisible();
    // Puede haber un botón en la barra PC y otro en el guard; basta con que exista uno.
    await expect(page.getByRole("button", { name: "Conectar MetaMask" }).first()).toBeVisible();
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
    await simularWallet(page, true, { tipo: "PARTICULAR", nivel: "INICIADO", estado: "INSCRITO" });
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

  test("móvil: la navegación inferior tiene el botón central hexagonal", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-chrome", "solo móvil (RNF-08.4)");
    // Wallet inscrita para que la BottomNav muestre las secciones completas.
    await simularWallet(page, true, { tipo: "PARTICULAR", nivel: "INICIADO", estado: "VERIFICADO" });
    await page.goto("/suite/mercado");
    const central = page.getByRole("link", { name: "Trueke" });
    await expect(central).toBeVisible();
    await expect(page.getByRole("link", { name: "Mercado" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Perfil" })).toBeVisible();
    // En móvil la barra superior de secciones PC no se muestra.
    await expect(page.getByRole("navigation", { name: "Secciones de la suite" })).toBeHidden();
  });

  test("PC: la barra superior de secciones se muestra según el rol (RF-14)", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "solo escritorio");
    await simularWallet(page, true, { tipo: "PARTICULAR", nivel: "INICIADO", estado: "VERIFICADO" });
    await page.goto("/suite/dashboard");
    // Barra superior PC con las secciones permitidas para Verificado
    await expect(page.getByRole("navigation", { name: "Secciones de la suite" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Mi Trueke Central/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Intercambio/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Inventario/ })).toBeVisible();
    // La BottomNav móvil NO se muestra en escritorio
    await expect(page.locator("nav[aria-label='Navegación principal']")).toBeHidden();
  });

  test("PC: el menú filtra secciones según el tipo de usuario (Socio ve gobernanza)", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "solo escritorio");
    await simularWallet(page, true, { tipo: "SOCIO", nivel: "SOCIO", estado: "CERTIFICADO" });
    await page.goto("/suite/dashboard");
    const nav = page.getByRole("navigation", { name: "Secciones de la suite" });
    // Un Particular Certificado NO vería estas secciones; el Socio sí:
    await expect(nav.getByRole("link", { name: /Socios/ })).toBeVisible(); // /suite/gobernanza
    await expect(nav.getByRole("link", { name: /Disputas/ })).toBeVisible();
    await expect(nav.getByRole("link", { name: /Finanzas/ })).toBeVisible();
    await expect(nav.getByRole("link", { name: /Admin/ })).toBeVisible();
    // La sección central del bottom (móvil) NO aparece en la barra superior PC.
    await expect(page.locator("nav[aria-label='Navegación principal']")).toBeHidden();
  });
});
