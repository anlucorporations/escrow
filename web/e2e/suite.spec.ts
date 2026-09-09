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

/** Inyecta una wallet simulada (MetaMask mock) y el estado de inscripción.
 *  `esOwnerSim`: la wallet simulada es el Owner (dueño on-chain) — la única que
 *  ve la sección Sistemas (/suite/admin). */
async function simularWallet(
  page: Page,
  inscrito: boolean,
  usuario: UsuarioSim = { tipo: "PARTICULAR", nivel: "INICIADO", estado: "INSCRITO" },
  esOwnerSim = false
) {
  await page.addInitScript(
    ([cuenta, est, usr, esOwn]) => {
      let estaInscrito = Boolean(est);
      const usuarioSim = usr as unknown as UsuarioSim;
      const esOwnerSim = Boolean(esOwn);

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
      // Login único (decisión del director): la wallet inscrita firmó UNA vez al
      // conectar → token global guardado (el guard deja pasar sin re-firma).
      if (estaInscrito) {
        localStorage.setItem("truekeate.token", "tok-e2e-suite");
        localStorage.setItem("truekeate.token.wallet", cuenta as string);
      }

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
                    esOwner: esOwnerSim,
                  }
                : { inscrito: false, usuario: null, esOwner: esOwnerSim }
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
              esOwner: esOwnerSim,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        // Login único: la firma EIP-191 emite el token global (POST /auth/session).
        if (url.includes("/auth/session") && init?.method === "POST") {
          return new Response(
            JSON.stringify({
              token: "tok-e2e-suite",
              usuario: { wallet: cuenta, ...usuarioSim },
              esOwner: esOwnerSim,
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
        // Mercado de trueques ofertados (modelo abierto-publicado, lógica maestra punto 3)
        if (url.includes("/truekes/ofertas") && !init?.method) {
          return new Response(
            JSON.stringify({
              truekes: [
                { id: 1, articuloAId: 1, tituloA: "Bicicleta de montaña", usuarioA: "0x9999", estado: "PROPUESTO", descripcionRequerida: "Busco un curso", tipoRequerido: "SERVICIO" },
                { id: 2, articuloAId: 2, tituloA: "Curso de fotografía", usuarioA: "0x8888", estado: "PROPUESTO", descripcionRequerida: "Busco una bici", tipoRequerido: "ARTICULO" },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        if (url.includes("/truekes") && !init?.method) {
          return new Response(
            JSON.stringify({
              truekes: [
                { id: 1, articuloAId: 1, tituloA: "Bicicleta de montaña", usuarioA: cuenta, usuarioB: "0x9999", estado: "CUSTODIADO" },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        return origFetch(input, init);
      };
    },
    [CUENTA, inscrito ? true : null, usuario, esOwnerSim] as unknown as string[]
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
    // Tras inscribirse, la wallet queda inscrita y el guard pide la ÚNICA firma
    // de login (decisión del director: autenticación solo al conectar/acceder).
    await expect(page.getByRole("heading", { name: /Inicia sesión con tu billetera/ })).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: /Iniciar sesión \(una firma\)/ }).click();
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

  test("PC: el menú filtra secciones según el tipo de usuario (Socio ve gobernanza, NO Sistemas)", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "solo escritorio");
    // Socio del padrón PERO no el Owner → Sistemas NO se muestra (decisión del director)
    await simularWallet(page, true, { tipo: "SOCIO", nivel: "SOCIO", estado: "CERTIFICADO" }, false);
    await page.goto("/suite/dashboard");
    const nav = page.getByRole("navigation", { name: "Secciones de la suite" });
    // Un Particular Certificado NO vería estas secciones; el Socio sí:
    await expect(nav.getByRole("link", { name: /Socios/ })).toBeVisible(); // /suite/gobernanza
    await expect(nav.getByRole("link", { name: /Disputas/ })).toBeVisible();
    await expect(nav.getByRole("link", { name: /Valor/ })).toBeVisible(); // VALOR (ex Finanzas)
    // Sistemas (RF-13.1) es SOLO del Owner: un Socio común NO la ve en la barra.
    await expect(nav.getByRole("link", { name: /Sistemas/ })).toHaveCount(0);
    // La sección central del bottom (móvil) NO aparece en la barra superior PC.
    await expect(page.locator("nav[aria-label='Navegación principal']")).toBeHidden();
  });

  test("PC: el icono Sistemas SOLO aparece para el Owner (dueño on-chain)", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "solo escritorio");
    await simularWallet(page, true, { tipo: "SOCIO", nivel: "SOCIO", estado: "CERTIFICADO" }, true);
    await page.goto("/suite/dashboard");
    const nav = page.getByRole("navigation", { name: "Secciones de la suite" });
    await expect(nav.getByRole("link", { name: /Sistemas/ })).toBeVisible(); // solo Owner
  });

  test("panel Admin (RF-13.1): el Owner ve el dashboard (login único ya hecho)", async ({ page }) => {
    await simularWallet(page, true, { tipo: "SOCIO", nivel: "SOCIO", estado: "CERTIFICADO" }, true);
    await page.goto("/suite/admin");
    await expect(page.getByRole("heading", { name: /Panel del Owner/ })).toBeVisible();
    // El login único se hizo al conectar: NO se vuelve a pedir firma por página.
    await expect(page.getByRole("button", { name: /Autenticar/ })).toHaveCount(0);
  });

  test("protección por URL: un Particular Certificado NO entra a /suite/admin", async ({ page }) => {
    await simularWallet(page, true, { tipo: "PARTICULAR", nivel: "INICIADO", estado: "CERTIFICADO" });
    await page.goto("/suite/admin");
    await expect(page.getByText("No tienes acceso a esta sección")).toBeVisible();
  });

  test("protección por URL: un Socio del padrón (NO Owner) NO entra a /suite/admin", async ({ page }) => {
    await simularWallet(page, true, { tipo: "SOCIO", nivel: "SOCIO", estado: "CERTIFICADO" }, false);
    await page.goto("/suite/admin");
    await expect(page.getByText("No tienes acceso a esta sección")).toBeVisible();
  });
});
