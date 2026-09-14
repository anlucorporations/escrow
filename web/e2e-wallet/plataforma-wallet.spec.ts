// =============================================================================
// TrueKeate — E2E de la PLATAFORMA × WALLET NATIVA (extensión real) · Fase 4
//
// Prueba la interacción de la dApp con la wallet nativa REAL (no simulada):
// descubrimiento EIP-6963, conexión con autorización por origen, login EIP-191,
// firma por acción, sesión persistente, auto-reconexión, accountsChanged,
// chainChanged y desconexión (wallet_revokePermissions).
//
// El backend se simula con `page.route` para que la prueba sea determinista y no
// escriba en la plataforma; la wallet y las firmas son reales.
//
// Uso:  (desde web/)  npm run test:wallet
// =============================================================================
import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import {
  SITE,
  CUENTA_0,
  CUENTA_1,
  extDisponible,
  lanzarExtension,
  popupConWallet,
} from "./helpers";

declare const chrome: {
  storage: {
    local: {
      set(items: Record<string, unknown>): Promise<void>;
      get(key: string): Promise<Record<string, unknown>>;
      remove(key: string): Promise<void>;
    };
  };
};

const USUARIO = { tipo: "PARTICULAR", nivel: "INICIADO", estado: "CERTIFICADO" };

test.skip(!extDisponible(), "wallet-extension/dist no está construido");
test.describe.configure({ mode: "serial" });

let ctx: BrowserContext;
let popup: Page;
let page: Page;

/** Simula el backend de la plataforma (evita escrituras reales). */
async function simularBackend(pagina: Page): Promise<void> {
  await pagina.route(
    (url) => url.href.includes("truekeate-api"),
    (route) => {
      const u = route.request().url();
      const metodo = route.request().method();
      const json = (body: unknown, status = 200) =>
        route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

      if (u.includes("/auth/estado")) return json({ inscrito: true, esOwner: false, usuario: { wallet: CUENTA_0, ...USUARIO } });
      if (u.includes("/auth/session")) return json({ token: "tok-e2e-wallet", esOwner: false, usuario: { wallet: CUENTA_0, ...USUARIO } });
      if (u.includes("/reputacion/mi"))
        return json({ puntaje: 70, nivel: "COMUN", medalla: "ORO", oroHistorico: false, metricas: { reputacionMedia: 4.5, efectivos: 3, apelaciones: 0 }, formula: "f" });
      if (u.includes("/disputas")) return json({ disputas: [] });
      if (u.includes("/puntos-encuentro")) return json({ favoritos: [], puntos: [] });
      if (u.includes("/truekes/ofertas")) return json({ truekes: [] });
      if (u.includes("/truekes")) return json({ truekes: [] });
      if (u.includes("/catalog")) return json({ articulos: [] });
      if (metodo === "POST") return json({ ok: true, articulo: { id: 1 } });
      return json({});
    }
  );
}

/**
 * Espera la vista de aprobación DENTRO de la wallet (popup) y verifica su texto.
 * El rediseño eliminó las ventanas flotantes: todo se atiende en la wallet.
 */
async function esperarAprobacion(texto: RegExp): Promise<void> {
  await popup.locator(".tk-aprobacion").waitFor({ timeout: 30_000 });
  await expect(popup.locator(".tk-aprobacion")).toContainText(texto);
}

/** Aprueba (último botón de la vista) y espera a que la aprobación desaparezca. */
async function aprobar(): Promise<void> {
  await popup.locator(".tk-aprobacion__acciones .tk-btn").last().click();
  await popup
    .locator(".tk-aprobacion")
    .waitFor({ state: "detached", timeout: 15_000 })
    .catch(() => undefined);
}

/** Comprueba que la aprobación no abrió ninguna ventana flotante nueva. */
function sinVentanasNuevas(antes: Page[]): void {
  const nuevas = ctx
    .pages()
    .filter(
      (p) => !antes.includes(p) && p.url().includes("chrome-extension://") && !p.url().includes("popup.html")
    );
  expect(nuevas.length).toBe(0);
}

test.beforeAll(async () => {
  const lanzado = await lanzarExtension();
  ctx = lanzado.ctx;
  popup = await popupConWallet(ctx, lanzado.id);
  page = await ctx.newPage();
  await page.setViewportSize({ width: 1280, height: 900 }); // vista PC: barra con la wallet nativa
  await simularBackend(page);
  await page.goto(`${SITE}/suite/dashboard`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3500);
});

test.afterAll(async () => {
  await ctx?.close();
});

// ── Descubrimiento y conexión ───────────────────────────────────────────

test("P-01 · la plataforma descubre la wallet nativa y la ofrece", async () => {
  await expect(
    page.getByRole("button", { name: /Wallet nativa instalada|Instalar wallet nativa/ }).first()
  ).toBeVisible();
  await page
    .getByRole("main")
    .getByRole("button", { name: /Conectar .* e iniciar sesión/ })
    .first()
    .click();
  const dialogo = page.getByRole("dialog", { name: "Elige tu billetera" });
  await expect(dialogo).toBeVisible();
  await expect(dialogo).toContainText("TrueKeate Wallet");
  await dialogo.getByRole("button", { name: /Cerrar/ }).click();
});

test("P-02 · conexión con autorización y login EIP-191", async () => {
  const antes = ctx.pages();
  await page
    .getByRole("main")
    .getByRole("button", { name: /Conectar .* e iniciar sesión/ })
    .first()
    .click();
  await page
    .getByRole("dialog", { name: "Elige tu billetera" })
    .getByRole("button", { name: /TrueKeate Wallet/ })
    .click();

  // Autorización por origen: se muestra dentro de la wallet
  await esperarAprobacion(/Solicitud de autorizaci/i);
  await expect(popup.locator(".tk-aprobacion__dapp")).toContainText(/truekeate/i);
  sinVentanasNuevas(antes);
  await aprobar();

  // Login único: firma EIP-191 con la wallet real, también en la wallet
  await esperarAprobacion(/EIP-191/i);
  await aprobar();

  await expect(page.getByRole("heading", { name: "Mi Trueke Central" })).toBeVisible({ timeout: 25_000 });
  const estado = await page.evaluate(() => ({
    token: localStorage.getItem("truekeate.token"),
    cuenta: localStorage.getItem("truekeate.account"),
  }));
  expect(estado.token).toBe("tok-e2e-wallet");
  expect(estado.cuenta).toBe(CUENTA_0.toLowerCase());
  expect(await page.getByText(/otra red/i).count()).toBe(0); // eth_chainId correcto
  sinVentanasNuevas(antes);
});

test("P-03 · sesión persistente: recargar no re-firma", async () => {
  const antes = ctx.pages();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Mi Trueke Central" })).toBeVisible({ timeout: 25_000 });
  expect(await page.evaluate(() => localStorage.getItem("truekeate.token"))).toBe("tok-e2e-wallet");
  // No debe aparecer ninguna ventana de firma nueva
  await page.waitForTimeout(1500);
  const firmasNuevas = ctx
    .pages()
    .filter((p) => !antes.includes(p) && p.url().includes("chrome-extension://"));
  expect(firmasNuevas.length).toBe(0);
});

test("P-04 · auto-reconexión (eth_accounts) sin pedir permiso", async () => {
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  expect(await page.evaluate(() => localStorage.getItem("truekeate.account"))).toBe(
    CUENTA_0.toLowerCase()
  );
});

// ── Firma por acción ────────────────────────────────────────────────────

test("P-05 · firma por acción (personal_sign) al publicar en el inventario", async () => {
  await page.goto(`${SITE}/suite/inventario`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  await page.getByRole("button", { name: /Nuevo elemento/ }).click();
  await page.getByPlaceholder(/Bicicleta de montaña/).fill("Artículo E2E");
  const antes = ctx.pages();
  await page.getByRole("button", { name: /Publicar artículo/ }).click();
  await esperarAprobacion(/EIP-191/i);
  sinVentanasNuevas(antes);
  await aprobar();
  // La plataforma envía la acción firmada (backend simulado) sin error
  await expect(page.getByText(/error al publicar/i)).toHaveCount(0, { timeout: 15_000 });
});

// ── Eventos de la wallet ────────────────────────────────────────────────

test("P-06 · accountsChanged: cambiar de cuenta en la wallet actualiza la plataforma", async () => {
  await page.goto(`${SITE}/suite/dashboard`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  await popup.locator(".tk-header__cuenta").selectOption("1");
  await page.waitForTimeout(2500);
  expect(await page.evaluate(() => localStorage.getItem("truekeate.account"))).toBe(
    CUENTA_1.toLowerCase()
  );
  await popup.locator(".tk-header__cuenta").selectOption("0");
  await page.waitForTimeout(1500);
});

test("P-07 · desconectar limpia la sesión y revoca la autorización del sitio", async () => {
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: "Menú de usuario" }).click();
  await page.getByRole("button", { name: /Desconectar billetera/ }).click();
  await page.waitForTimeout(2000);
  expect(await page.evaluate(() => localStorage.getItem("truekeate.account"))).toBeNull();
  const sitios = await popup.evaluate(() =>
    chrome.storage.local.get("codecrypto_connected_sites")
  );
  const conectados = (sitios.codecrypto_connected_sites as Record<string, string>) || {};
  const origenPlataforma = Object.keys(conectados).find((o) => o.includes("truekeate"));
  expect(origenPlataforma).toBeUndefined(); // el sitio quedó revocado en la wallet
});

test("P-08 · chainChanged: en la conexión la plataforma avisa de red incorrecta", async () => {
  await expect(page.getByRole("heading", { name: /Conecta tu billetera para continuar/ })).toBeVisible();
  await popup.evaluate(() => chrome.storage.local.set({ codecrypto_chain_id: "0xaa36a7" }));
  await expect(page.getByText(/otra red/i).first()).toBeVisible({ timeout: 15_000 });
  await popup.evaluate(() => chrome.storage.local.set({ codecrypto_chain_id: "0x7a69" }));
  await expect(page.getByText(/otra red/i)).toHaveCount(0, { timeout: 15_000 });
});
