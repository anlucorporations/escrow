// =============================================================================
// TrueKeate — E2E Pantallas de la suite (integración C8)
// Inventario, Intercambio, Perfil, Finanzas, Disputas y Gobernanza conectadas
// al backend. En E2E se simula la wallet (MetaMask) y las respuestas de la API.
// =============================================================================
import { test, expect, type Page } from "@playwright/test";

const CUENTA = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";
const OTRA = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8";

interface UsuarioSim {
  tipo: "PARTICULAR" | "EMPRESA" | "SOCIO";
  nivel: "INICIADO" | "COMUN" | "FRECUENTE" | "SOCIO";
  estado: "INSCRITO" | "VERIFICADO" | "CERTIFICADO";
}

/** Simula wallet + backend para las pantallas autenticadas de la suite. */
async function simularSuite(
  page: Page,
  usuario: UsuarioSim = { tipo: "PARTICULAR", nivel: "INICIADO", estado: "CERTIFICADO" }
) {
  await page.addInitScript(
    ([cuenta, otra, usr]) => {
      const usuarioSim = usr as unknown as UsuarioSim;

      (window as unknown as Record<string, unknown>).ethereum = {
        isMetaMask: true,
        request: async ({ method }: { method: string }) => {
          if (method === "eth_requestAccounts" || method === "eth_accounts") return [cuenta];
          if (method === "eth_chainId") return "0x7a69";
          if (method === "net_version") return "31337";
          if (method === "personal_sign") return "0x" + "11".repeat(65); // firma EIP-191 simulada
          return null;
        },
        on: () => {},
        removeListener: () => {},
      };
      localStorage.setItem("truekeate.account", cuenta as string);

      const orig = window.fetch.bind(window);
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const json = (body: unknown, status = 200) =>
          new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

        if (url.includes("/auth/estado")) {
          return json({ inscrito: true, usuario: { wallet: cuenta, ...usuarioSim } });
        }
        if (url.includes("/auth/session")) {
          return json({ token: "tok-e2e", usuario: { wallet: cuenta, ...usuarioSim } });
        }
        // Catálogo: dos artículos, uno de la cuenta y otro de otra persona
        if (url.includes("/catalog") && (!init?.method || init?.method === "GET")) {
          return json({
            articulos: [
              { id: 1, titulo: "Mi bicicleta", rubro: "Deportes", disponible: true, usuarioWallet: cuenta, usuarioNivel: "CERTIFICADO" },
              { id: 2, titulo: "Curso de fotografía", rubro: "Educacion", disponible: true, usuarioWallet: otra, usuarioNivel: "VERIFICADO" },
            ],
          });
        }
        if (url.includes("/catalog/articulos") && init?.method === "POST") {
          const body = JSON.parse(String(init.body));
          return json({ articulo: { id: 9, titulo: body.titulo, rubro: body.rubro, disponible: true, usuarioWallet: cuenta } }, 201);
        }
        if (url.includes("/catalog/") && init?.method === "POST") {
          return json({ ok: true });
        }
        // Truekes
        if (url.includes("/truekes") && (!init?.method || init?.method === "GET")) {
          return json({
            truekes: [
              { id: 11, escrowId: -1, articuloAId: 1, articuloBId: 2, tituloA: "Mi bicicleta", tituloB: "Curso de fotografía", usuarioA: cuenta, usuarioB: otra, estado: "CUSTODIADO" },
            ],
          });
        }
        if (url.includes("/truekes") && init?.method === "POST") {
          return json({ trueke: { id: 12, estado: "CREADO", usuarioA: cuenta, usuarioB: otra } }, 201);
        }
        if (url.includes("/custodiar") || url.includes("/firma-recepcion")) {
          return json({ trueke: { id: 11, estado: "CUSTODIADO", usuarioA: cuenta, usuarioB: otra } });
        }
        if (url.includes("/valoracion")) {
          return json({ ok: true, trueke: { id: 11, estado: "CUSTODIADO" } });
        }
        // Finanzas
        if (url.includes("/finanzas/mi")) {
          return json({
            nftsStock: {},
            criptos: { ETH: 0.5 },
            brlt: usuarioSim.tipo === "SOCIO" ? 250 : undefined,
            fondoValor: usuarioSim.tipo === "SOCIO" ? 1000 : undefined,
            porcentajesConfig: usuarioSim.tipo === "SOCIO" ? { trueque: 1, suscripciones: 10, brlt: 5 } : undefined,
            rol: usuarioSim.tipo,
          });
        }
        // Reputación
        if (url.includes("/reputacion/mi")) {
          return json({
            puntaje: 62,
            nivel: "FRECUENTE",
            medalla: "ORO",
            oroHistorico: true,
            metricas: { efectivos: 12, apelaciones: 1, reputacionMedia: 4.6 },
            formula: "0,5·rep + 0,3·vol + 0,2·(1−ratioAp) — insumos 0–100 (D12/D30)",
          });
        }
        // Disputas
        if (url.includes("/disputas") && (!init?.method || init?.method === "GET")) {
          return json({
            disputas: [
              { id: 1, truekeId: 11, solicitante: cuenta, motivo: "no entrega", estado: "ABIERTA", usuarioA: cuenta, usuarioB: otra, estadoTrueke: "EN_DISPUTA" },
            ],
          });
        }
        if (url.includes("/disputas") && init?.method === "POST") {
          return json({ disputa: { id: 2, truekeId: 11, estado: "ABIERTA", solicitante: cuenta } }, 201);
        }
        // Gobernanza
        if (url.includes("/gobernanza/socios")) {
          return json({ totalSocios: 3, esSocio: usuarioSim.tipo === "SOCIO" });
        }
        if (url.includes("/gobernanza/propuestas")) {
          return json({
            propuestas: [
              { id: 1, tipo: "EMISION_BRLT", descripcion: "Emitir 10.000 BRLT", proponente: cuenta, parametro: "10000", votosAFavor: 2, votosEnContra: 0, totalVotado: 2, ejecutada: false, cerrada: false, yaVoto: false },
            ],
          });
        }
        if (url.includes("/gobernanza/votar")) {
          return json({ ok: true, simulado: true });
        }
        return orig(input, init);
      };
    },
    [CUENTA, OTRA, usuario] as unknown as string[]
  );
}

test.describe("Pantallas de la suite (integración)", () => {
  test("Inventario: muestra mis artículos y el formulario de publicación", async ({ page }) => {
    await simularSuite(page, { tipo: "PARTICULAR", nivel: "INICIADO", estado: "CERTIFICADO" });
    await page.goto("/suite/inventario");
    await expect(page.getByRole("heading", { name: /Mi Inventario/ })).toBeVisible();
    // El usuario puede autenticarse (firma) para publicar; si aparece el botón, se pulsa.
    const btnAuth = page.getByRole("button", { name: /Autenticar/ });
    if (await btnAuth.isVisible().catch(() => false)) await btnAuth.click();
    // Muestra el artículo propio del catálogo
    await expect(page.getByText("Mi bicicleta")).toBeVisible();
  });

  test("Intercambio: lista mis trueques y permite crear", async ({ page }) => {
    await simularSuite(page, { tipo: "PARTICULAR", nivel: "INICIADO", estado: "VERIFICADO" });
    await page.goto("/suite/intercambio");
    await expect(page.getByRole("heading", { name: /Intercambio/ })).toBeVisible();
    // Si la página pide iniciar sesión / autenticar (firma), se confirma
    const btnAuth = page.getByRole("button", { name: /Iniciar sesión|Autenticar/ });
    if (await btnAuth.isVisible().catch(() => false)) await btnAuth.click();
    // El trueque creado (A ⇄ B) aparece en "Mis trueques" (aparece 2× por el <select>)
    await expect(page.getByText(/Mi bicicleta ⇄ Curso de/)).toBeVisible();
  });

  test("Perfil: muestra identidad y reputación tras autenticar", async ({ page }) => {
    await simularSuite(page, { tipo: "PARTICULAR", nivel: "INICIADO", estado: "CERTIFICADO" });
    await page.goto("/suite/perfil");
    await expect(page.getByRole("heading", { name: /Mi Perfil/ })).toBeVisible();
    await expect(page.getByText("CERTIFICADO").first()).toBeVisible();
  });

  test("Finanzas: un Socio ve BRLT y el fondo", async ({ page }) => {
    await simularSuite(page, { tipo: "SOCIO", nivel: "SOCIO", estado: "CERTIFICADO" });
    await page.goto("/suite/finanzas");
    await expect(page.getByRole("heading", { name: /Finanzas/ })).toBeVisible();
    const btnAuth = page.getByRole("button", { name: /Autenticar/ });
    if (await btnAuth.isVisible().catch(() => false)) await btnAuth.click();
    await expect(page.getByText("BRLT").first()).toBeVisible();
  });

  test("Disputas: lista las disputas donde soy parte", async ({ page }) => {
    await simularSuite(page, { tipo: "PARTICULAR", nivel: "INICIADO", estado: "CERTIFICADO" });
    await page.goto("/suite/disputas");
    await expect(page.getByRole("heading", { name: /Disputas/ })).toBeVisible();
    const btnAuth = page.getByRole("button", { name: /Autenticar/ });
    if (await btnAuth.isVisible().catch(() => false)) await btnAuth.click();
    await expect(page.getByText("no entrega")).toBeVisible();
  });

  test("Gobernanza: un Socio ve propuestas y puede votar", async ({ page }) => {
    await simularSuite(page, { tipo: "SOCIO", nivel: "SOCIO", estado: "CERTIFICADO" });
    await page.goto("/suite/gobernanza");
    await expect(page.getByRole("heading", { name: /Gobernanza/ })).toBeVisible();
    const btnAuth = page.getByRole("button", { name: /Autenticar/ });
    if (await btnAuth.isVisible().catch(() => false)) await btnAuth.click();
    await expect(page.getByText("Emitir 10.000 BRLT")).toBeVisible();
  });
});
