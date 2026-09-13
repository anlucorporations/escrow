// =============================================================================
// TrueKeate — E2E de CONEXIÓN y FIRMAS de la wallet nativa · Fase 4
//
// Provoca desde una dApp real (la plataforma) el flujo completo de la extensión:
//   1) eth_requestAccounts → ventana «Solicitud de autorización» → conectar.
//   2) personal_sign       → ventana «Solicitud de firma» (EIP-191) → aprobar.
//   3) eth_signTypedData_v4→ ventana EIP-712 con descripción estructurada.
//   4) rechazo del usuario → error 4001.
//
// Uso:  (desde web/)  npm run test:wallet
// =============================================================================
import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import {
  SITE,
  CUENTA_0,
  extDisponible,
  lanzarExtension,
  popupConWallet,
} from "./helpers";

declare global {
  interface Window {
    codecrypto?: { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> };
  }
}

test.skip(!extDisponible(), "wallet-extension/dist no está construido");
test.describe.configure({ mode: "serial" });

let ctx: BrowserContext;
let dapp: Page;

/**
 * Espera una ventana NUEVA de la extensión (no presente antes de la petición)
 * que contenga el texto dado. Se excluyen las páginas capturadas en `antes`
 * para no confundir una ventana anterior que se está cerrando.
 */
async function esperarVentana(texto: RegExp, antes: Page[] = []): Promise<Page> {
  const excluidas = new Set(antes);
  const limite = Date.now() + 30_000;
  while (Date.now() < limite) {
    const paginas = ctx
      .pages()
      .filter((p) => p.url().includes("chrome-extension://") && !excluidas.has(p));
    for (const p of paginas) {
      const contenido = await p.content().catch(() => "");
      if (texto.test(contenido)) return p;
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`No apareció la ventana ${texto}`);
}

/** Espera a que una ventana de aprobación se cierre sola tras responder. */
async function esperarCierre(win: Page): Promise<void> {
  await win
    .waitForEvent("close", { timeout: 8_000 })
    .catch(() => undefined);
}

test.beforeAll(async () => {
  const lanzado = await lanzarExtension();
  ctx = lanzado.ctx;
  // Crea la wallet (el popup queda abierto para mantener vivo el service worker).
  await popupConWallet(ctx, lanzado.id);
  dapp = await ctx.newPage();
  await dapp.goto(`${SITE}/`, { waitUntil: "domcontentloaded" });
  await dapp.waitForFunction(() => typeof window.codecrypto === "object", { timeout: 20_000 });
});

test.afterAll(async () => {
  await ctx?.close();
});

test("S-01 · eth_requestAccounts abre «Solicitud de autorización» y conecta", async () => {
  const antes = ctx.pages();
  const promesa = dapp.evaluate(() => window.codecrypto!.request({ method: "eth_requestAccounts" }));
  const connect = await esperarVentana(/Solicitud de autorizaci/i, antes);
  await expect(connect.locator(".notification-header")).toContainText(/Solicitud de autorizaci/i);
  await expect(connect.locator(".tk-brand__logo")).toHaveAttribute("src", /logoIntegral/);
  await expect(connect.locator(".connect-origin")).toBeVisible();

  // Aprobar la conexión
  await connect.locator(".account-item").first().click();
  await connect.getByRole("button", { name: /Conectar/ }).click();

  const cuentas = (await promesa) as string[];
  expect(Array.isArray(cuentas)).toBe(true);
  expect(cuentas[0].toLowerCase()).toBe(CUENTA_0.toLowerCase());
  await esperarCierre(connect);
});

test("S-02 · eth_accounts devuelve la cuenta autorizada", async () => {
  const cuentas = (await dapp.evaluate(() =>
    window.codecrypto!.request({ method: "eth_accounts" })
  )) as string[];
  expect(cuentas[0].toLowerCase()).toBe(CUENTA_0.toLowerCase());
});

test("S-03 · personal_sign (EIP-191) abre la firma y aprueba", async () => {
  const antes = ctx.pages();
  const promesa = dapp.evaluate((cuenta) =>
    window.codecrypto!.request({
      method: "personal_sign",
      params: ["0x547275654b656174653a20707275656261", cuenta],
    }),
    CUENTA_0
  );
  const firma = await esperarVentana(/EIP-191/i, antes);
  await expect(firma.locator(".notification-header")).toContainText(/EIP-191/i);
  await firma.getByRole("button", { name: /Aprobar/ }).click();
  const resultado = (await promesa) as string;
  expect(resultado.startsWith("0x")).toBe(true);
  expect(resultado.length).toBeGreaterThan(120);
  await esperarCierre(firma);
});

test("S-04 · eth_signTypedData_v4 (EIP-712) muestra la descripción estructurada", async () => {
  const typed = {
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "chainId", type: "uint256" },
      ],
      Mail: [{ name: "value", type: "uint256" }],
    },
    primaryType: "Mail",
    domain: { name: "TrueKeate", chainId: 31337 },
    message: { value: "123" },
  };
  const antes = ctx.pages();
  const promesa = dapp.evaluate(
    ([cuenta, datos]) =>
      window.codecrypto!.request({
        method: "eth_signTypedData_v4",
        params: [cuenta, JSON.stringify(datos)],
      }),
    [CUENTA_0, typed] as [string, unknown]
  );
  const firma = await esperarVentana(/EIP-712/i, antes);
  const cuerpo = firma.locator("body");
  await expect(cuerpo).toContainText(/Billetera firmante/i);
  await expect(cuerpo).toContainText(/Qué se firma/i);
  await expect(cuerpo).toContainText("TrueKeate");
  await expect(cuerpo).toContainText(/Fecha y hora/i);
  await firma.getByRole("button", { name: /Aprobar/ }).click();
  const resultado = (await promesa) as string;
  expect(resultado.startsWith("0x")).toBe(true);
  await esperarCierre(firma);
});

test("S-05 · el rechazo del usuario produce error 4001", async () => {
  const antes = ctx.pages();
  // El código EIP-1193 se captura en la propia página (Playwright no conserva
  // propiedades del error al serializar la promesa).
  const promesa = dapp.evaluate(async (cuenta) => {
    try {
      await window.codecrypto!.request({
        method: "personal_sign",
        params: ["0x72656368617a6172", cuenta],
      });
      return "sin-error";
    } catch (e) {
      return `code:${(e as { code?: number }).code}`;
    }
  }, CUENTA_0);
  const firma = await esperarVentana(/EIP-191/i, antes);
  await firma.getByRole("button", { name: /Rechazar/ }).click();
  expect(await promesa).toBe("code:4001");
  await esperarCierre(firma);
});
