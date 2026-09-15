// =============================================================================
// TrueKeate — E2E de FUNCIONES del popup de la wallet nativa · Fase 4
//
// Rediseño (2026-09-15): el inicio es una sola página con
//   1) ficha de balance deslizable (carrusel de monedas),
//   2) barra de operaciones (Enviar/Recibir/Cambiar/Comprar) que carga la
//      operación DENTRO de la ficha de balance,
//   3) ficha con pestañas (Actividades · Tokens · NFTs · Contactos),
//   4) pie con estado de la dApp + Configuración (Perfil/Redes/Ayuda), Bloquear
//      y Desconectar.
// Ancho fijo 480 px y páginas a todo el ancho, sin márgenes.
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
  abrirOperacion,
  volverSaldo,
  abrirPestana,
  abrirConfig,
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

// ── Estructura del inicio ───────────────────────────────────────────────

test("F-00 · header, ancho 480 y nuevo inicio (balance + operaciones + pestañas)", async () => {
  await expect(popup.locator(".tk-header__titulo")).toHaveText("TrueKeate Wallet");
  await expect(popup.locator(".tk-header__cuenta")).toBeVisible();
  await expect(popup.locator(".tk-header__red")).toContainText(/Anvil|31337/);
  expect(await popup.evaluate(() => getComputedStyle(document.body).width)).toBe("480px");

  await expect(popup.locator(".tk-balance")).toBeVisible();
  await expect(popup.locator(".tk-ops__boton")).toHaveCount(4);
  await expect(popup.locator(".tk-ficha-tabs .tk-tab")).toHaveText([
    "Actividades",
    "Tokens",
    "NFTs",
    "Contactos",
  ]);
});

test("F-01 · header: cambiar de cuenta actualiza el saldo mostrado", async () => {
  await expect(popup.locator(".tk-balance__cuenta")).toContainText(CUENTA_0.slice(0, 10));
  await popup.locator(".tk-header__cuenta").selectOption("1");
  await popup.waitForTimeout(700);
  await expect(popup.locator(".tk-balance__cuenta")).toContainText(CUENTA_1.slice(0, 10));
  await popup.locator(".tk-header__cuenta").selectOption("0");
  await popup.waitForTimeout(400);
});

test("F-02 · ficha de balance: muestra el saldo de ETH", async () => {
  await expect(popup.locator(".tk-balance__monto")).toContainText("ETH");
  await expect(popup.locator(".tk-balance__simbolo")).toHaveText("ETH");
});

test("F-03 · balance deslizable: añadir una moneda crea otra diapositiva", async () => {
  // Sin tokens solo hay la diapositiva de ETH (sin flechas ni puntos)
  await expect(popup.locator(".tk-balance__punto")).toHaveCount(0);

  await popup.evaluate((dir) =>
    chrome.storage.local.set({ codecrypto_tokens: [{ address: dir, chainId: "0x7a69" }] }),
    NO_CONTRATO
  );
  await expect(popup.locator(".tk-balance__punto")).toHaveCount(2, { timeout: 15_000 });

  const antes = await popup.locator(".tk-balance__slide").getAttribute("data-moneda");
  await popup.getByRole("button", { name: "Moneda siguiente" }).click();
  await expect(popup.locator(".tk-balance__slide")).not.toHaveAttribute("data-moneda", antes ?? "");
  await popup.getByRole("button", { name: "Moneda anterior" }).click();
  await expect(popup.locator(".tk-balance__slide")).toHaveAttribute("data-moneda", "ETH");

  await popup.evaluate(() => chrome.storage.local.set({ codecrypto_tokens: [] }));
  await expect(popup.locator(".tk-balance__punto")).toHaveCount(0, { timeout: 15_000 });
});

// ── Operaciones dentro de la ficha de balance ───────────────────────────

test("F-04 · Enviar: el formulario se carga en la ficha de balance", async () => {
  await abrirOperacion(popup, /Enviar/);
  await expect(popup.locator(".transfer-section")).toBeVisible();
  await expect(popup.locator(".tk-balance__operacion-titulo")).toHaveText("Enviar");
  await volverSaldo(popup);
});

test("F-05 · Recibir: QR y copiar en la ficha de balance", async () => {
  await abrirOperacion(popup, /Recibir/);
  await expect(popup.locator(".tk-recibir svg")).toBeVisible();
  await expect(popup.locator(".tk-recibir__direccion")).toContainText(CUENTA_0.slice(0, 8));
  await expect(popup.getByRole("button", { name: /Copiar dirección/ })).toBeVisible();
  await volverSaldo(popup);
});

test("F-06 · Comprar: panel guiado en la ficha de balance", async () => {
  await abrirOperacion(popup, /Comprar/);
  await expect(popup.locator(".tk-comprar")).toBeVisible();
  await expect(popup.getByRole("button", { name: /Ir a comprar/ })).toBeVisible();
  await volverSaldo(popup);
});

test("F-07 · Cambiar: formulario de swap en la ficha de balance", async () => {
  await abrirOperacion(popup, /Cambiar/);
  await expect(popup.locator(".tk-cambiar")).toBeVisible();
  await expect(popup.getByPlaceholder(/Router del DEX/)).toBeVisible();
  await volverSaldo(popup);
});

// ── Ficha con pestañas ──────────────────────────────────────────────────

test("F-08 · Contactos: validación, alta, duplicado y baja", async () => {
  await abrirPestana(popup, /Contactos/);
  const panel = popup.locator(".tk-contactos");
  await expect(panel).toBeVisible();

  await panel.getByPlaceholder("Nombre").fill("Ana");
  await panel.getByPlaceholder("0x…").fill("0x123");
  await panel.getByRole("button", { name: /Guardar/ }).click();
  await expect(panel).toContainText(/inválida/i);

  await panel.getByPlaceholder("0x…").fill(CUENTA_1);
  await panel.getByRole("button", { name: /Guardar/ }).click();
  await expect(panel.locator(".tk-sitio")).toHaveCount(1);

  await panel.getByPlaceholder("Nombre").fill("Otra");
  await panel.getByPlaceholder("0x…").fill(CUENTA_1);
  await panel.getByRole("button", { name: /Guardar/ }).click();
  await expect(panel).toContainText(/ya está guardada/i);

  await panel.locator(".tk-sitio__desconectar").first().click();
  await expect(panel.locator(".tk-sitio")).toHaveCount(0);
});

test("F-09 · Tokens: validación, alta, duplicado y baja", async () => {
  await abrirPestana(popup, /^Tokens$/);
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

test("F-10 · NFTs: validación y lectura de una colección", async () => {
  await abrirPestana(popup, /NFTs/);
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

test("F-11 · Actividades: estado inicial y refresco", async () => {
  await abrirPestana(popup, /Actividades/);
  const panel = popup.locator(".tk-actividad");
  await expect(panel).toBeVisible();
  await expect(panel).toContainText(/Sin movimientos|Entrada|Salida/i);
  await expect(panel.getByRole("button", { name: /Actualizar/ })).toBeVisible();
});

// ── Pie: conexiones, bloqueo y menú de configuración ────────────────────

test("F-12 · Conexiones: el estado del pie abre la gestión y desconecta", async () => {
  await popup.evaluate((cuenta) =>
    chrome.storage.local.set({ codecrypto_connected_sites: { "https://dapp.example": cuenta } }),
    CUENTA_0
  );
  await popup.waitForTimeout(500);
  await popup.locator(".tk-footer__dapp").click();
  const cuerpo = popup.locator(".tk-pagina__cuerpo");
  await expect(cuerpo).toContainText("dapp.example");
  await cuerpo.locator(".tk-sitio__desconectar").first().click();
  await popup.waitForTimeout(600);
  await expect(cuerpo).toContainText(/Ninguna dApp conectada/i);
  const sitios = await popup.evaluate(() => chrome.storage.local.get("codecrypto_connected_sites"));
  expect(Object.keys((sitios.codecrypto_connected_sites as object) || {})).toHaveLength(0);
  await popup.locator(".tk-pagina__volver").click();
  await popup.locator(".tk-inicio").waitFor();
});

test("F-13 · Pie: estado de la dApp + 3 acciones (sin sección de actividad)", async () => {
  await expect(popup.locator(".tk-footer")).toBeVisible();
  await expect(popup.locator(".tk-footer__dapp")).toBeVisible();
  // Configuración, Bloquear y Desconectar
  await expect(popup.locator(".tk-footer__acciones > button")).toHaveCount(2);
  await expect(popup.locator('.tk-menu button[title="Configuración"]')).toBeVisible();
  // La actividad salió del pie
  await expect(popup.locator(".tk-footer .tk-logs")).toHaveCount(0);
  await expect(popup.locator(".tk-footer")).not.toContainText(/actividad/i);
});

test("F-14 · Menú Configuración: Perfil, Redes, Ayuda, Notificaciones y Modo de vista", async () => {
  await popup.locator('.tk-menu button[title="Configuración"]').click();
  const menu = popup.locator(".tk-menu__lista");
  for (const item of [/Perfil/, /Redes/, /Ayuda/, /Notificaciones/, /Modo de vista/]) {
    await expect(menu.getByRole("menuitem", { name: item })).toBeVisible();
  }
  // Cerrar sin elegir
  await popup.locator('.tk-menu button[title="Configuración"]').click();
  await expect(menu).toHaveCount(0);
});

test("F-15 · Redes: pestañas y Bitcoin informativo (desde el menú)", async () => {
  await abrirConfig(popup, /Redes/);
  const redes = popup.locator(".tk-redes");
  await expect(redes.getByRole("tab", { name: "Públicas" })).toBeVisible();
  await expect(redes).toContainText("Ethereum");
  await expect(redes).toContainText("Bitcoin");
  await expect(redes).toContainText(/solo informativo/);
  await redes.getByRole("tab", { name: "Prueba" }).click();
  await expect(redes).toContainText("Sepolia");
  await redes.getByRole("tab", { name: "Personalizadas" }).click();
  await expect(redes).toContainText(/Aún no hay redes personalizadas|Red personalizada/i);
  await popup.locator(".tk-pagina__volver").click();
  await popup.locator(".tk-inicio").waitFor();
});

// ── Perfil ──────────────────────────────────────────────────────────────

test("F-16 · Perfil: modo oscuro y respaldo de la frase", async () => {
  await abrirConfig(popup, /Perfil/);
  const perfil = popup.locator(".tk-perfil");
  await expect(perfil).toBeVisible();

  const switchOscuro = perfil.locator('.tk-switch input[type="checkbox"]');
  await switchOscuro.check();
  expect(await popup.evaluate(() => document.documentElement.dataset.theme)).toBe("dark");
  await switchOscuro.uncheck();
  expect(await popup.evaluate(() => document.documentElement.dataset.theme)).toBe("light");

  await perfil.getByRole("button", { name: /Mostrar frase/ }).click();
  await expect(perfil.locator(".tk-perfil__frase")).toHaveText(MNEMONIC);
  await perfil.getByRole("button", { name: /^Ocultar$/ }).click();
  await expect(perfil.locator(".tk-perfil__frase")).toHaveCount(0);
});

test("F-17 · Perfil: cambio de clave (incorrecta y correcta)", async () => {
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

test("F-18 · Perfil: backup exportable y restauración", async () => {
  const perfil = popup.locator(".tk-perfil");
  const descarga = popup.waitForEvent("download");
  await perfil.getByRole("button", { name: /Descargar backup/ }).click();
  const dl = await descarga;
  const ruta = await dl.path();
  expect(ruta).toBeTruthy();
  const backup = JSON.parse(fs.readFileSync(ruta as string, "utf8"));
  expect(backup.cifrado).toBeTruthy();
  expect(backup.kdf).toBe("PBKDF2-SHA256");
  expect(JSON.stringify(backup)).not.toContain("test test");

  await perfil.getByPlaceholder("Contraseña del backup").fill(PASS2);
  await perfil.locator('.tk-backup input[type="file"]').setInputFiles(ruta as string);
  await expect(perfil).toContainText(/Bóveda restaurada/i);
});

// ── Accesos recuperados en el menú ──────────────────────────────────────

test("F-19 · Menú: Notificaciones y Modo de vista abren sus páginas", async () => {
  await popup.locator(".tk-pagina__volver").click();
  await popup.locator(".tk-inicio").waitFor();

  await abrirConfig(popup, /Notificaciones/);
  await expect(popup.locator(".tk-pagina__titulo")).toHaveText("Notificaciones");
  await expect(popup.locator(".tk-notifs")).toBeVisible();
  await popup.locator(".tk-pagina__volver").click();
  await popup.locator(".tk-inicio").waitFor();

  await abrirConfig(popup, /Modo de vista/);
  await expect(popup.locator(".tk-pagina__titulo")).toHaveText("Modo de vista");
  await expect(popup.locator(".tk-modos .tk-modo")).toHaveCount(3);
  await popup.locator(".tk-pagina__volver").click();
  await popup.locator(".tk-inicio").waitFor();
});
