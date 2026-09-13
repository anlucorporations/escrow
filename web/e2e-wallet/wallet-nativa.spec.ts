// =============================================================================
// TrueKeate — E2E de la WALLET NATIVA (extensión) · Fase 4
//
// Automatiza los casos AUTOMATIZABLES del checklist
// `RepoTecnico/pruebas/checklist_wallet_nativa.md`:
//   TC-WN-01/02  descarga e instalación desde la plataforma
//   TC-WN-04/05  detección de la extensión en la web
//   TC-WN-06     botón de wallet nativa en la barra de la suite
//   TC-WN-07     modal de selección de billetera (sin selector permanente)
//   TC-WN-09     cero interferencia con MetaMask
//   TC-WN-13     identidad visual en el popup
//   TC-WN-39/40  modo flotante y modo recordado
//
// Los casos interactivos (firma, KYC, tokens/NFT con contratos reales…) siguen
// siendo manuales: el popup autenticado no se puede abrir como pestaña sin
// activar el guard «solo extensión» de la bóveda.
//
// Uso:  (desde web/)  npm run test:wallet
// =============================================================================
import { test, expect, chromium, type BrowserContext } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const EXT = path.resolve(process.cwd(), "../wallet-extension/dist");
const SITE =
  process.env.BASE_URL || "https://truekeate-web-593453426217.europe-west1.run.app";

/** API de extensión que usan los `page.evaluate` (el runner no trae @types/chrome). */
declare const chrome: {
  storage: {
    local: {
      set(items: Record<string, unknown>): Promise<void>;
      get(key: string): Promise<Record<string, unknown>>;
    };
  };
};

/** MetaMask simulada: anuncia EIP-6963 y registra las llamadas que recibe. */
const FAKE_METAMASK = () => {
  const w = window as unknown as { __metaCalls: string[] };
  w.__metaCalls = [];
  const listeners: Record<string, Array<(a: unknown) => void>> = {};
  const provider = {
    isMetaMask: true,
    request: async ({ method }: { method: string }) => {
      w.__metaCalls.push(method);
      if (method === "eth_requestAccounts" || method === "eth_accounts")
        return ["0x1111111111111111111111111111111111111111"];
      if (method === "eth_chainId") return "0x7a69";
      if (method === "personal_sign") return "0xfirma-meta";
      if (method === "wallet_revokePermissions") return null;
      return null;
    },
    on: (e: string, cb: (a: unknown) => void) => {
      (listeners[e] ||= []).push(cb);
    },
    removeListener: () => {},
  };
  (window as unknown as { ethereum: unknown }).ethereum = provider;
  const announce = () =>
    window.dispatchEvent(
      new CustomEvent("eip6963:announceProvider", {
        detail: {
          info: { uuid: "11111111-1111-1111-1111-111111111111", name: "MetaMask", icon: "", rdns: "io.metamask" },
          provider,
        },
      })
    );
  window.addEventListener("eip6963:requestProvider", announce);
  announce();
};

test.describe.configure({ mode: "serial" });

function extDisponible(): boolean {
  return fs.existsSync(path.join(EXT, "manifest.json"));
}

/** Lanza un navegador con la extensión cargada y devuelve el contexto y su id. */
async function conExtension(): Promise<{ ctx: BrowserContext; id: string }> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tk-wallet-e2e-"));
  const ctx = await chromium.launchPersistentContext(dir, {
    channel: "chromium",
    headless: true,
    viewport: { width: 1280, height: 900 },
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

// ── A. Instalación y detección (M7) ─────────────────────────────────────

test("TC-WN-01 · la plataforma ofrece la descarga de la wallet", async ({ request }) => {
  const r = await request.get(`${SITE}/instalar-wallet`);
  expect(r.status()).toBe(200);
  const html = await r.text();
  expect(html).toContain("Descargar wallet");
  expect(html).toContain("TrueKeateWallet.zip");
});

test("TC-WN-02 · el paquete .zip se sirve correctamente", async ({ request }) => {
  const r = await request.get(`${SITE}/wallet/TrueKeateWallet.zip`);
  expect(r.status()).toBe(200);
  expect(String(r.headers()["content-type"])).toContain("zip");
  const cuerpo = await r.body();
  expect(cuerpo.subarray(0, 2).toString("latin1")).toBe("PK"); // firma ZIP
  expect(cuerpo.length).toBeGreaterThan(100_000);
});

test("TC-WN-04 · sin extensión, la portada ofrece instalarla", async () => {
  const navegador = await chromium.launch({ headless: true });
  try {
    const page = await navegador.newPage();
    await page.goto(`${SITE}/`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    await expect(
      page.getByRole("button", { name: /Instalar wallet nativa/ }).first()
    ).toBeVisible();
  } finally {
    await navegador.close();
  }
});

test("TC-WN-05 · con la extensión, la portada la detecta", async () => {
  test.skip(!extDisponible(), "wallet-extension/dist no está construido");
  const { ctx } = await conExtension();
  try {
    const page = await ctx.newPage();
    await page.goto(`${SITE}/`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3500);
    await expect(
      page.getByRole("button", { name: /Wallet nativa instalada/ }).first()
    ).toBeVisible();
    await page.getByRole("button", { name: /Wallet nativa instalada/ }).first().click();
    const dialogo = page.getByRole("dialog");
    await expect(dialogo).toContainText(/está instalada en este navegador/i);
  } finally {
    await ctx.close();
  }
});

test("TC-WN-06 · la barra de la suite muestra el acceso a la wallet nativa", async () => {
  test.skip(!extDisponible(), "wallet-extension/dist no está construido");
  const { ctx } = await conExtension();
  try {
    const page = await ctx.newPage();
    await page.goto(`${SITE}/suite/dashboard`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3500);
    await expect(
      page.getByRole("button", { name: /Wallet nativa instalada|Instalar wallet nativa/ }).first()
    ).toBeVisible();
  } finally {
    await ctx.close();
  }
});

// ── B. Conexión y no interferencia ──────────────────────────────────────

test("TC-WN-07 y 09 · modal de selección y cero interferencia con MetaMask", async () => {
  test.skip(!extDisponible(), "wallet-extension/dist no está construido");
  const { ctx } = await conExtension();
  try {
    await ctx.addInitScript(FAKE_METAMASK);
    const page = await ctx.newPage();
    await page.goto(`${SITE}/suite/dashboard`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3500);

    // TC-WN-07 · no hay selector permanente
    expect(await page.locator('select[aria-label="Elegir billetera"]').count()).toBe(0);

    // Abrir el modal y comprobar que lista las dos wallets
    await page
      .getByRole("main")
      .getByRole("button", { name: /Conectar .* e iniciar sesión/ })
      .click();
    const dialogo = page.getByRole("dialog", { name: "Elige tu billetera" });
    await expect(dialogo).toBeVisible();
    await expect(dialogo).toContainText("MetaMask");
    await expect(dialogo).toContainText("CodeCrypto Wallet");

    // Elegir CodeCrypto y comprobar la no interferencia
    await dialogo.getByRole("button", { name: /CodeCrypto Wallet/ }).click();
    await page.waitForTimeout(4000);
    const estado = await page.evaluate(() => ({
      ethereumEsMetaMask: Boolean(
        (window as unknown as { ethereum?: { isMetaMask?: boolean } }).ethereum?.isMetaMask
      ),
      metaCalls: (window as unknown as { __metaCalls: string[] }).__metaCalls,
    }));
    expect(estado.ethereumEsMetaMask).toBe(true); // no se sobrescribe window.ethereum
    expect(estado.metaCalls).not.toContain("eth_requestAccounts");
    expect(estado.metaCalls).not.toContain("personal_sign");
  } finally {
    await ctx.close();
  }
});

// ── C. Identidad visual del popup ───────────────────────────────────────

test("TC-WN-13 · el popup muestra la identidad de TrueKeate", async () => {
  test.skip(!extDisponible(), "wallet-extension/dist no está construido");
  const { ctx, id } = await conExtension();
  try {
    const page = await ctx.newPage();
    await page.goto(`chrome-extension://${id}/index.html`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    await expect(page.locator(".tk-brand__title")).toHaveText("CodeCrypto Wallet");
    await expect(page.locator(".tk-brand__logo")).toHaveAttribute("src", /logoIntegral/);
  } finally {
    await ctx.close();
  }
});

// ── H. Modos de vista: flotante y persistencia ──────────────────────────

test("TC-WN-39 y 40 · el modo flotante se inyecta y el modo se recuerda", async () => {
  test.skip(!extDisponible(), "wallet-extension/dist no está construido");
  const { ctx, id } = await conExtension();
  try {
    const ext = await ctx.newPage();
    await ext.goto(`chrome-extension://${id}/index.html`, { waitUntil: "domcontentloaded" });

    // Activar el modo flotante
    await ext.evaluate(() => chrome.storage.local.set({ codecrypto_view_mode: "flotante" }));
    const page = await ctx.newPage();
    await page.goto(`${SITE}/`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3500);
    const flotante = await page.evaluate(() => {
      const host = document.getElementById("codecrypto-floating-host");
      const sr = host?.shadowRoot;
      return {
        host: Boolean(host),
        boton: sr?.getElementById("cc-btn")?.textContent ?? null,
        iframe: Boolean(sr?.querySelector("iframe")),
      };
    });
    expect(flotante.host).toBe(true);
    expect(flotante.boton).toBe("🔐");
    expect(flotante.iframe).toBe(true);

    // TC-WN-40 · el modo queda guardado
    const modo = await ext.evaluate(() =>
      chrome.storage.local
        .get("codecrypto_view_mode")
        .then((s: Record<string, unknown>) => s.codecrypto_view_mode)
    );
    expect(modo).toBe("flotante");

    // Al cambiar de modo, el overlay desaparece
    await ext.evaluate(() => chrome.storage.local.set({ codecrypto_view_mode: "panel" }));
    await page.waitForTimeout(1500);
    expect(await page.evaluate(() => Boolean(document.getElementById("codecrypto-floating-host")))).toBe(false);
  } finally {
    await ctx.close();
  }
});
