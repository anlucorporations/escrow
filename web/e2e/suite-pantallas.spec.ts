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
      // Login único: la wallet inscrita ya firmó al conectar → token global.
      localStorage.setItem("truekeate.token", "tok-e2e-pantallas");
      localStorage.setItem("truekeate.token.wallet", cuenta as string);

      const orig = window.fetch.bind(window);
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const json = (body: unknown, status = 200) =>
          new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

        if (url.includes("/auth/estado")) {
          return json({ inscrito: true, esOwner: false, usuario: { wallet: cuenta, ...usuarioSim } });
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
        // VALOR (ex Finanzas)
        if (url.includes("/valor/mi")) {
          const esGestion = ["SOCIO", "EMPRESA"].includes(usuarioSim.tipo);
          return json({
            rol: usuarioSim.tipo,
            saldos: {
              criptos: esGestion ? { ETH: 0.5 } : undefined,
              brlt: esGestion ? 250 : undefined,
              fondoValor: esGestion ? 1000 : undefined,
            },
            criptosHabilitado: esGestion,
            brltHabilitado: esGestion,
            tasaEthBrlt: 3000,
            reputacion: { puntaje: 62, nivel: "FRECUENTE", medalla: "ORO", reputacionMedia: 4.6, truequesCompletados: 3 },
            pendientesValoracion: [],
            ultimasValoraciones: [],
            movimientos: [],
          });
        }
        // Subastas (RF-17)
        if (url.includes("/subastas/mis")) {
          return json({ creadas: [], pujadas: [] });
        }
        if (url.includes("/subastas") && (!init?.method || init?.method === "GET")) {
          const s = {
            id: 1,
            empresa: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc".toLowerCase(),
            empresaUsername: "ecotech",
            articuloId: 3,
            articuloTitulo: "Lote de notebooks reacondicionadas",
            articuloRubro: "Electronica",
            pujaInicial: 100,
            incrementoMinimo: 10,
            duracionHoras: 24,
            estado: "ABIERTA",
            pujas: [],
            cierraEn: new Date(Date.now() + 3_600_000).toISOString(),
          };
          if (url.includes("estado=")) {
            return json({ subastas: url.includes("ABIERTA") ? [s] : [] });
          }
          return json({ subastas: [s] });
        }
        if (url.includes("/subastas") && init?.method === "POST") {
          return json({ subasta: { id: 2, estado: "ABIERTA", pujaInicial: 100, pujas: [] } }, 201);
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
        if (url.includes("/disputas/padron")) {
          return json({ esSocio: usuarioSim.tipo === "SOCIO", totalSocios: 3, padron: [cuenta, otra] });
        }
        if (url.includes("/disputas/votaciones")) {
          return json({ votaciones: [] });
        }
        if (url.includes("/disputas") && (!init?.method || init?.method === "GET")) {
          return json({
            disputas: [
              { id: 1, truekeId: 11, solicitante: cuenta, motivo: "no entrega", estado: "REPORTADA", usuarioA: cuenta, usuarioB: otra, cierreA: "CONFORME", cierreB: "NO_CONFORME", estadoTrueke: "EN_DISPUTA", createdAt: new Date().toISOString() },
            ],
          });
        }
        if (url.includes("/disputas") && init?.method === "POST") {
          return json({ disputa: { id: 2, truekeId: 11, estado: "EN_VOTACION", solicitante: cuenta } }, 201);
        }
        // Notificaciones
        if (url.includes("/notificaciones")) {
          return json({ notificaciones: [], noLeidas: 0 });
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

  test("Intercambio: lista mis trueques activos (el alta vive en Mi Trueke Central)", async ({ page }) => {
    await simularSuite(page, { tipo: "PARTICULAR", nivel: "INICIADO", estado: "VERIFICADO" });
    await page.goto("/suite/intercambio");
    await expect(page.getByRole("heading", { name: /Intercambio/ })).toBeVisible();
    // Si la página pide iniciar sesión / autenticar (firma), se confirma
    const btnAuth = page.getByRole("button", { name: /Iniciar sesión|Autenticar/ });
    if (await btnAuth.isVisible().catch(() => false)) await btnAuth.click();
    // El trueque activo (A ⇄ B) aparece en "Mis trueques"
    await expect(page.getByText(/Mi bicicleta ⇄ Curso de/)).toBeVisible();
    // El alta de trueques ya NO está en Intercambio (decisión del director: solo en Mi Trueke Central)
    await expect(page.getByRole("heading", { name: /Nuevo trueque/ })).toHaveCount(0);
  });

  test("Perfil: muestra identidad y reputación tras autenticar", async ({ page }) => {
    await simularSuite(page, { tipo: "PARTICULAR", nivel: "INICIADO", estado: "CERTIFICADO" });
    await page.goto("/suite/perfil");
    await expect(page.getByRole("heading", { name: /Mi Perfil/ })).toBeVisible();
    await expect(page.getByText("CERTIFICADO").first()).toBeVisible();
  });

  test("VALOR: un Socio gestiona criptos y ve BRLT", async ({ page }) => {
    await simularSuite(page, { tipo: "SOCIO", nivel: "SOCIO", estado: "CERTIFICADO" });
    await page.goto("/suite/valor");
    await expect(page.getByRole("heading", { name: /VALOR/ })).toBeVisible();
    const btnAuth = page.getByRole("button", { name: /Autenticar/ });
    if (await btnAuth.isVisible().catch(() => false)) await btnAuth.click();
    await expect(page.getByText(/BRLT/).first()).toBeVisible();
  });

  test("VALOR: un Particular NO gestiona criptos ni BRLT (contenido restringido)", async ({ page }) => {
    await simularSuite(page, { tipo: "PARTICULAR", nivel: "INICIADO", estado: "CERTIFICADO" });
    await page.goto("/suite/valor");
    const btnAuth = page.getByRole("button", { name: /Autenticar/ });
    if (await btnAuth.isVisible().catch(() => false)) await btnAuth.click();
    await expect(page.getByText(/gestión de criptos es de/i)).toBeVisible();
  });

  test("Disputas: lista las disputas donde soy parte", async ({ page }) => {
    await simularSuite(page, { tipo: "PARTICULAR", nivel: "INICIADO", estado: "CERTIFICADO" });
    await page.goto("/suite/disputas");
    await expect(page.getByRole("heading", { name: /Disputas/ })).toBeVisible();
    const btnAuth = page.getByRole("button", { name: /Autenticar/ });
    if (await btnAuth.isVisible().catch(() => false)) await btnAuth.click();
    await expect(page.getByText(/no entrega/)).toBeVisible();
  });

  test("Gobernanza: un Socio ve propuestas y puede votar", async ({ page }) => {
    await simularSuite(page, { tipo: "SOCIO", nivel: "SOCIO", estado: "CERTIFICADO" });
    await page.goto("/suite/gobernanza");
    await expect(page.getByRole("heading", { name: /Gobernanza/ })).toBeVisible();
    const btnAuth = page.getByRole("button", { name: /Autenticar/ });
    if (await btnAuth.isVisible().catch(() => false)) await btnAuth.click();
    await expect(page.getByText("Emitir 10.000 BRLT")).toBeVisible();
  });

  test("Subastas: la Empresa ve el listado y puede crear", async ({ page }) => {
    await simularSuite(page, { tipo: "EMPRESA", nivel: "FRECUENTE", estado: "CERTIFICADO" });
    await page.goto("/suite/subastas");
    await expect(page.getByRole("heading", { name: /Subastas/ })).toBeVisible();
    const btnAuth = page.getByRole("button", { name: /Autenticar/ });
    if (await btnAuth.isVisible().catch(() => false)) await btnAuth.click();
    await expect(page.getByRole("button", { name: /Crear subasta/ })).toBeVisible();
    await expect(page.getByText(/Lote de notebooks/)).toBeVisible();
  });

  test("Subastas: un Particular Certificado puja (botón Pujar)", async ({ page }) => {
    await simularSuite(page, { tipo: "PARTICULAR", nivel: "INICIADO", estado: "CERTIFICADO" });
    await page.goto("/suite/subastas");
    const btnAuth = page.getByRole("button", { name: /Autenticar/ });
    if (await btnAuth.isVisible().catch(() => false)) await btnAuth.click();
    await expect(page.getByRole("button", { name: /Pujar \(100\)/ })).toBeVisible();
  });

});
