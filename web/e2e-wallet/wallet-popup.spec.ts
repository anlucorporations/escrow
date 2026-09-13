// =============================================================================
// TrueKeate — E2E de FUNCIONES del popup de la wallet nativa · Fase 4
//
// Recorrido completo de la interfaz autenticada: cuenta, balance, gestión de
// saldo (Recibir/Enviar/Comprar/Cambiar/Contactos), red, características
// (Tokens/NFT/Actividad), conexiones, configuración (notificaciones, modos,
// redes, ayuda, perfil), perfil (modo oscuro, respaldo, clave, backup) y pie.
//
// Uso:  (desde web/)  npm run test:wallet
// =============================================================================
import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import fs from "node:fs";
import {
  MNEMONIC,
  CUENTA_0,
  CUENTA_1,
  PASS,
  extDisponible,
  lanzarExtension,
  popupConWallet,
  abrirFicha,
  cerrarFicha,
} from "./helpers";

declare const chrome: {
  storage: {
    local: {
      set(items: Record<string, unknown>): Promise<void>;
      get(key: string): Promise<Record<string, unknown>>;
    };
  };
};

const PASS2 = "password456";
const NO_CONTRATO = "0x000000000000000000000000000000000000dEaD";

test.skip(!extDisponible(), "wallet-extension/dist no está construido");
test.describe.configure({ mode: "serial" });

let ctx: BrowserContext;
let popup: Page;

test.beforeAll(async () => {
  const lanzado = await lanzarExtension();
  ctx = lanzado.ctx;
  popup = await popupConWallet(ctx, lanzado.id);
});

test.afterAll(async () => {
  await ctx?.close();
});

// ── Cuenta y balance ────────────────────────────────────────────────────

test("F-01 · Cuenta: dirección derivada y cambio de cuenta", async () => {
  await abrirFicha(popup, "Cuenta");
  await expect(popup.locator(".address")).toContainText(CUENTA_0.slice(0, 10));
  await popup.locator(".account-selector select").selectOption("1");
  await popup.waitForTimeout(600);
  await expect(popup.locator(".address")).toContainText(CUENTA_1.slice(0, 10));
  await popup.locator(".account-selector select").selectOption("0"); // restaurar
});

test("F-02 · Balance: muestra el saldo de ETH", async () => {
  await expect(popup.locator(".balance")).toContainText("ETH");
});

// ── Gestión de saldo ────────────────────────────────────────────────────

test("F-03 · Recibir: QR y copiar", async () => {
  await abrirFicha(popup, "Gestionar saldo");
  await popup.getByRole("button", { name: /Recibir/ }).click();
  await expect(popup.locator(".tk-recibir svg")).toBeVisible();
  await expect(popup.locator(".tk-recibir__direccion")).toContainText(CUENTA_0.slice(0, 8));
  await expect(popup.getByRole("button", { name: /Copiar dirección/ })).toBeVisible();
  await popup.getByRole("button", { name: /Recibir/ }).click(); // cerrar
});

test("F-04 · Enviar: formulario de envío disponible", async () => {
  await abrirFicha(popup, "Enviar");
  const ficha = popup.locator(".tk-ficha", { hasText: "Enviar" }).first();
  await expect(ficha).toContainText(/Enviar|destinatario|cantidad/i);
});

test("F-05 · Comprar: panel guiado", async () => {
  await popup.getByRole("button", { name: /Comprar/ }).click();
  await expect(popup.locator(".tk-comprar")).toBeVisible();
  await expect(popup.getByRole("button", { name: /Ir a comprar/ })).toBeVisible();
  await popup.getByRole("button", { name: /Comprar/ }).click();
});

test("F-06 · Cambiar: formulario de swap", async () => {
  await popup.getByRole("button", { name: /Cambiar/ }).click();
  await expect(popup.locator(".tk-cambiar")).toBeVisible();
  await expect(popup.getByPlaceholder(/Router del DEX/)).toBeVisible();
  await expect(popup.getByRole("button", { name: /Cotizar/ })).toBeVisible();
  await popup.getByRole("button", { name: /Cambiar/ }).click();
});

test("F-07 · Contactos: validación, alta, duplicado y baja", async () => {
  await popup.getByRole("button", { name: /Contactos/ }).click();
  const panel = popup.locator(".tk-contactos");
  await expect(panel).toBeVisible();

  // inválida
  await panel.getByPlaceholder("Nombre").fill("Ana");
  await panel.getByPlaceholder("0x…").fill("0x123");
  await panel.getByRole("button", { name: /Guardar/ }).click();
  await expect(panel).toContainText(/inválida/i);

  // válida
  await panel.getByPlaceholder("0x…").fill(CUENTA_1);
  await panel.getByRole("button", { name: /Guardar/ }).click();
  await expect(panel.locator(".tk-sitio")).toHaveCount(1);

  // duplicada
  await panel.getByPlaceholder("Nombre").fill("Otra");
  await panel.getByPlaceholder("0x…").fill(CUENTA_1);
  await panel.getByRole("button", { name: /Guardar/ }).click();
  await expect(panel).toContainText(/ya está guardada/i);

  // baja
  await panel.locator(".tk-sitio__desconectar").first().click();
  await expect(panel.locator(".tk-sitio")).toHaveCount(0);
  await popup.getByRole("button", { name: /Contactos/ }).click();
});

// ── Red ─────────────────────────────────────────────────────────────────

test("F-08 · Red: el gestor lista las redes y permite añadir", async () => {
  await abrirFicha(popup, "Red");
  const ficha = popup.locator(".tk-ficha", { hasText: "Red" }).first();
  await expect(ficha).toContainText(/Chain ID/);
  await expect(ficha.getByRole("button", { name: /Añadir red|Agregar|personalizada/i }).first()).toBeVisible();
});

// ── Características: Tokens / NFT / Actividad ───────────────────────────

test("F-09 · Tokens: validación, alta, duplicado y baja", async () => {
  await abrirFicha(popup, "Características");
  await popup.getByRole("tab", { name: "Tokens" }).click();
  const panel = popup.locator(".tk-tokens");
  await expect(panel).toBeVisible();

  await panel.getByPlaceholder(/Dirección del token/).fill("0xabc");
  await panel.getByRole("button", { name: /Añadir/ }).click();
  await expect(panel).toContainText(/inválida/i);

  await panel.getByPlaceholder(/Dirección del token/).fill(NO_CONTRATO);
  await panel.getByRole("button", { name: /Añadir/ }).click();
  await expect(panel.locator(".tk-sitio")).toHaveCount(1);
  await expect(panel.locator(".tk-sitio")).toContainText(/Token no ERC-20/);

  await panel.getByPlaceholder(/Dirección del token/).fill(NO_CONTRATO);
  await panel.getByRole("button", { name: /Añadir/ }).click();
  await expect(panel).toContainText(/ya está en la lista/i);

  await panel.locator(".tk-sitio__desconectar").first().click();
  await expect(panel.locator(".tk-sitio")).toHaveCount(0);
});

test("F-10 · NFT: validación y lectura de una colección", async () => {
  await popup.getByRole("tab", { name: "NFT" }).click();
  const panel = popup.locator(".tk-nft");
  await expect(panel).toBeVisible();
  await panel.getByPlaceholder(/Colección NFT/).fill("0xabc");
  await panel.getByRole("button", { name: /Añadir/ }).click();
  await expect(panel).toContainText(/inválida/i);
  await panel.getByPlaceholder(/Colección NFT/).fill(NO_CONTRATO);
  await panel.getByRole("button", { name: /Añadir/ }).click();
  await expect(panel.locator(".tk-coleccion")).toHaveCount(1);
  await expect(panel).toContainText(/No se pudo leer la colección|0 NFT/i);
  await panel.locator(".tk-sitio__desconectar").first().click();
  await expect(panel.locator(".tk-coleccion")).toHaveCount(0);
});

test("F-11 · Actividad: estado inicial y refresco", async () => {
  await popup.getByRole("tab", { name: "Actividad" }).click();
  const panel = popup.locator(".tk-actividad");
  await expect(panel).toBeVisible();
  await expect(panel).toContainText(/Sin movimientos|Entrada|Salida/i);
  await expect(panel.getByRole("button", { name: /Actualizar/ })).toBeVisible();
  await cerrarFicha(popup, "Características");
});

// ── Conexiones y pie ────────────────────────────────────────────────────

test("F-12 · Conexiones: lista la dApp conectada y la desconecta", async () => {
  await popup.evaluate((cuenta) =>
    chrome.storage.local.set({ codecrypto_connected_sites: { "https://dapp.example": cuenta } }),
    CUENTA_0
  );
  await popup.waitForTimeout(600);
  await abrirFicha(popup, "Conexiones");
  const ficha = popup.locator(".tk-ficha", { hasText: "Conexiones" }).first();
  await expect(ficha).toContainText("dapp.example");
  await ficha.locator(".tk-sitio__desconectar").first().click();
  await popup.waitForTimeout(600);
  await expect(ficha).toContainText(/Ninguna dApp conectada/i);
  const sitios = await popup.evaluate(() =>
    chrome.storage.local.get("codecrypto_connected_sites")
  );
  expect(Object.keys((sitios.codecrypto_connected_sites as object) || {})).toHaveLength(0);
});

test("F-13 · Pie: bloqueo y reinicio presentes", async () => {
  await expect(popup.locator(".tk-footer")).toBeVisible();
  await expect(popup.locator(".tk-footer__acciones button").first()).toBeVisible();
});

// ── Configuración ───────────────────────────────────────────────────────

test("F-14 · Configuración: cinco áreas", async () => {
  await abrirFicha(popup, "Configuración");
  const cfg = popup.locator(".tk-config");
  for (const area of ["Notificaciones", "Modo de vista", "Red", "Ayuda", "Perfil"]) {
    await expect(cfg).toContainText(area);
  }
  await expect(cfg.locator(".tk-notifs")).toBeVisible();
  await expect(cfg.getByRole("button", { name: /Abrir la ayuda/ })).toBeVisible();
});

test("F-15 · Redes: pestañas y Bitcoin informativo", async () => {
  const cfg = popup.locator(".tk-config");
  await cfg.getByRole("button", { name: /Gestionar redes/ }).click();
  const redes = popup.locator(".tk-redes");
  await expect(redes.getByRole("tab", { name: "Públicas" })).toBeVisible();
  await expect(redes).toContainText("Ethereum");
  await expect(redes).toContainText("Bitcoin");
  await expect(redes).toContainText(/solo informativo/);
  await redes.getByRole("tab", { name: "Prueba" }).click();
  await expect(redes).toContainText("Sepolia");
  await redes.getByRole("tab", { name: "Personalizadas" }).click();
  await expect(redes).toContainText(/Aún no hay redes personalizadas|Red personalizada/i);
  await popup.getByRole("button", { name: /← Configuración/ }).click();
});

test("F-16 · Modo de vista: pestaña abre otra página", async () => {
  const cfg = popup.locator(".tk-config");
  const [nueva] = await Promise.all([
    ctx.waitForEvent("page", { timeout: 15_000 }),
    cfg.getByRole("button", { name: /Pestaña/ }).click(),
  ]);
  expect(nueva.url()).toContain("index.html");
  await nueva.close();
  // restaurar a panel para no dejar estado raro
  await popup.evaluate(() => chrome.storage.local.set({ codecrypto_view_mode: "panel" }));
});

test("F-17 · Perfil: modo oscuro y respaldo de la frase", async () => {
  const cfg = popup.locator(".tk-config");
  await cfg.getByRole("button", { name: /Abrir perfil/ }).click();
  const perfil = popup.locator(".tk-perfil");
  await expect(perfil).toBeVisible();

  // modo oscuro
  const switchOscuro = perfil.locator('.tk-switch input[type="checkbox"]');
  await switchOscuro.check();
  expect(await popup.evaluate(() => document.documentElement.dataset.theme)).toBe("dark");
  await switchOscuro.uncheck();
  expect(await popup.evaluate(() => document.documentElement.dataset.theme)).toBe("light");

  // respaldo de la frase
  await perfil.getByRole("button", { name: /Mostrar frase/ }).click();
  await expect(perfil.locator(".tk-perfil__frase")).toHaveText(MNEMONIC);
  await perfil.getByRole("button", { name: /^Ocultar$/ }).click();
  await expect(perfil.locator(".tk-perfil__frase")).toHaveCount(0);
});

test("F-18 · Perfil: cambio de clave (incorrecta y correcta)", async () => {
  const perfil = popup.locator(".tk-perfil");
  await perfil.getByPlaceholder("Contraseña actual").fill("clave-mala");
  await perfil.getByPlaceholder("Nueva contraseña (mín. 8)").fill(PASS2);
  await perfil.getByPlaceholder("Repite la nueva").fill(PASS2);
  await perfil.getByRole("button", { name: /Cambiar clave/ }).click();
  await expect(perfil).toContainText(/no es correcta/i);

  await perfil.getByPlaceholder("Contraseña actual").fill(PASS);
  await perfil.getByPlaceholder("Nueva contraseña (mín. 8)").fill(PASS2);
  await perfil.getByPlaceholder("Repite la nueva").fill(PASS2);
  await perfil.getByRole("button", { name: /Cambiar clave/ }).click();
  await expect(perfil).toContainText(/Clave de bloqueo actualizada/i);
});

test("F-19 · Perfil: backup exportable y restauración", async () => {
  const perfil = popup.locator(".tk-perfil");
  const descarga = popup.waitForEvent("download");
  await perfil.getByRole("button", { name: /Descargar backup/ }).click();
  const dl = await descarga;
  const ruta = await dl.path();
  expect(ruta).toBeTruthy();
  const backup = JSON.parse(fs.readFileSync(ruta as string, "utf8"));
  expect(backup.cifrado).toBeTruthy();
  expect(backup.kdf).toBe("PBKDF2-SHA256");
  expect(JSON.stringify(backup)).not.toContain("test test"); // nunca la frase en claro

  await perfil.getByPlaceholder("Contraseña del backup").fill(PASS2);
  await perfil.locator('.tk-backup input[type="file"]').setInputFiles(ruta as string);
  await expect(perfil).toContainText(/Bóveda restaurada/i);
});
