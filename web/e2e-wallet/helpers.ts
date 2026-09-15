// =============================================================================
// Helpers E2E compartidos para la WALLET NATIVA (extensión).
// =============================================================================
import { chromium, type BrowserContext, type Page } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const EXT = path.resolve(process.cwd(), "../wallet-extension/dist");
export const SITE =
  process.env.BASE_URL || "https://truekeate-web-593453426217.europe-west1.run.app";

export const MNEMONIC = "test test test test test test test test test test test junk";
export const CUENTA_0 = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
export const CUENTA_1 = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
export const PASS = "password123";

/** La suite necesita `wallet-extension/dist` construido. */
export function extDisponible(): boolean {
  return fs.existsSync(path.join(EXT, "manifest.json"));
}

/** Lanza un navegador persistente con la extensión cargada. */
export async function lanzarExtension(): Promise<{ ctx: BrowserContext; id: string }> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tk-wallet-"));
  const ctx = await chromium.launchPersistentContext(dir, {
    channel: "chromium",
    headless: true,
    viewport: { width: 420, height: 860 },
    args: [
      "--headless=new",
      `--disable-extensions-except=${EXT}`,
      `--load-extension=${EXT}`,
      "--no-sandbox",
    ],
  });
  let sw = ctx.serviceWorkers()[0];
  if (!sw) sw = await ctx.waitForEvent("serviceworker", { timeout: 20_000 });
  return { ctx, id: new URL(sw.url()).host };
}

/** Abre el popup y deja la wallet lista: importa el mnemonic y crea la bóveda. */
export async function popupConWallet(ctx: BrowserContext, id: string, password = PASS): Promise<Page> {
  const popup = await ctx.newPage();
  await popup.goto(`chrome-extension://${id}/index.html`, { waitUntil: "domcontentloaded" });
  await popup.locator("textarea").waitFor({ timeout: 15_000 });
  await popup.locator("textarea").fill(MNEMONIC);
  await popup.waitForTimeout(1200); // validación BIP-39
  await popup.getByRole("button", { name: /Cargar Wallet/ }).click();
  await popup.locator("#vault-pass").waitFor({ timeout: 25_000 });
  await popup.locator("#vault-pass").fill(password);
  await popup.locator("#vault-pass2").fill(password);
  await popup.getByRole("button", { name: /Cifrar y continuar/ }).click();
  await popup.locator(".tk-inicio").first().waitFor({ timeout: 90_000 }); // PBKDF2
  await popup.waitForTimeout(1200);
  return popup;
}

/** Abre una operación en la ficha de balance (Enviar/Recibir/Cambiar/Comprar). */
export async function abrirOperacion(popup: Page, nombre: string | RegExp): Promise<void> {
  await popup.locator(".tk-ops").getByRole("button", { name: nombre }).first().click();
  await popup.locator(".tk-balance__operacion").waitFor({ timeout: 10_000 });
}

/** Vuelve del contenido de la operación al carrusel de saldo. */
export async function volverSaldo(popup: Page): Promise<void> {
  await popup.locator(".tk-balance__volver").click();
  await popup.locator(".tk-balance__carrusel").waitFor({ timeout: 10_000 });
}

/** Abre una pestaña del detalle (Actividades/Tokens/NFTs/Contactos). */
export async function abrirPestana(popup: Page, nombre: string | RegExp): Promise<void> {
  await popup.locator(".tk-ficha-tabs").getByRole("tab", { name: nombre }).click();
  await popup.waitForTimeout(200);
}

/** Abre una opción del menú desplegable de Configuración del pie. */
export async function abrirConfig(popup: Page, nombre: string | RegExp): Promise<void> {
  await popup.locator('.tk-menu button[title="Configuración"]').click();
  await popup.locator(".tk-menu__lista").getByRole("menuitem", { name: nombre }).click();
  await popup.waitForTimeout(200);
}
