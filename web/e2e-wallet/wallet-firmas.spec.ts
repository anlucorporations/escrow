// =============================================================================
// TrueKeate — E2E de CONEXIÓN y FIRMAS de la wallet nativa · Fase 4
//
// Rediseño (2026-09-14): las aprobaciones se muestran DENTRO de la wallet
// (popup), no en ventanas flotantes. Se prueba:
//   1) eth_requestAccounts → «Solicitud de autorización» en el popup → conectar.
//   2) personal_sign       → «Firmar mensaje · EIP-191» → aprobar.
//   3) eth_signTypedData_v4→ «Firmar mensaje · EIP-712» con descripción.
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
let popup: Page;
let dapp: Page;

/** Espera la vista de aprobación dentro de la wallet con el texto dado. */
async function esperarAprobacion(texto: RegExp): Promise<void> {
  await popup.locator(".tk-aprobacion").waitFor({ timeout: 30_000 });
  await expect(popup.locator(".tk-aprobacion")).toContainText(texto);
}

/** Aprueba (último botón) y espera a que la aprobación desaparezca. */
async function aprobar(): Promise<void> {
  await popup.locator(".tk-aprobacion__acciones .tk-btn").last().click();
  await popup.locator(".tk-aprobacion").waitFor({ state: "detached", timeout: 15_000 }).catch(() => undefined);
}

/** Rechaza (primer botón). */
async function rechazar(): Promise<void> {
  await popup.locator(".tk-aprobacion__acciones .tk-btn").first().click();
}

test.beforeAll(async () => {
  const lanzado = await lanzarExtension();
  ctx = lanzado.ctx;
  popup = await popupConWallet(ctx, lanzado.id);
  dapp = await ctx.newPage();
  await dapp.goto(`${SITE}/`, { waitUntil: "domcontentloaded" });
  await dapp.waitForFunction(() => typeof window.codecrypto === "object", { timeout: 20_000 });
});

test.afterAll(async () => {
  await ctx?.close();
});

test("S-01 · eth_requestAccounts abre la autorización DENTRO de la wallet", async () => {
  const paginasAntes = ctx.pages().length;
  const promesa = dapp.evaluate(() => window.codecrypto!.request({ method: "eth_requestAccounts" }));
  await esperarAprobacion(/Solicitud de autorización/i);
  await expect(popup.locator(".tk-aprobacion__dapp")).toContainText(/truekeate/i);
  // No debe abrirse ninguna ventana flotante nueva
  expect(ctx.pages().length).toBe(paginasAntes);

  await aprobar();
  const cuentas = (await promesa) as string[];
  expect(cuentas[0].toLowerCase()).toBe(CUENTA_0.toLowerCase());
});

test("S-02 · eth_accounts devuelve la cuenta autorizada", async () => {
  const cuentas = (await dapp.evaluate(() =>
    window.codecrypto!.request({ method: "eth_accounts" })
  )) as string[];
  expect(cuentas[0].toLowerCase()).toBe(CUENTA_0.toLowerCase());
});

test("S-03 · personal_sign (EIP-191) se aprueba en la wallet", async () => {
  const promesa = dapp.evaluate((cuenta) =>
    window.codecrypto!.request({
      method: "personal_sign",
      params: ["0x547275654b656174653a20707275656261", cuenta],
    }),
    CUENTA_0
  );
  await esperarAprobacion(/EIP-191/i);
  await aprobar();
  const resultado = (await promesa) as string;
  expect(resultado.startsWith("0x")).toBe(true);
  expect(resultado.length).toBeGreaterThan(120);
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
  const promesa = dapp.evaluate(
    ([cuenta, datos]) =>
      window.codecrypto!.request({
        method: "eth_signTypedData_v4",
        params: [cuenta, JSON.stringify(datos)],
      }),
    [CUENTA_0, typed] as [string, unknown]
  );
  await esperarAprobacion(/EIP-712/i);
  await expect(popup.locator(".tk-aprobacion")).toContainText(/Billetera firmante/i);
  await expect(popup.locator(".tk-aprobacion")).toContainText(/Qué se firma/i);
  await expect(popup.locator(".tk-aprobacion")).toContainText("TrueKeate");
  await expect(popup.locator(".tk-aprobacion")).toContainText(/Fecha y hora/i);
  await aprobar();
  const resultado = (await promesa) as string;
  expect(resultado.startsWith("0x")).toBe(true);
});

test("S-05 · el rechazo del usuario produce error 4001", async () => {
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
  await esperarAprobacion(/EIP-191/i);
  await rechazar();
  expect(await promesa).toBe("code:4001");
});
