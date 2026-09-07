// =============================================================================
// TrueKeate — E2E Desconectar billetera y reconectar con OTRA wallet
// Reproduce el reporte del director:
//   "al usar el botón Desconectar del menú de usuario no desconecta y al tratar
//    de conectarme con otra wallet el proyecto queda con la wallet anterior".
// Causa raíz: al desconectar NO se revocaba el permiso eth_accounts en MetaMask
// (wallet_revokePermissions), así que el siguiente eth_requestAccounts devolvía
// la cuenta ANTERIOR sin mostrar el selector de cuentas.
// El mock imita ese comportamiento de MetaMask:
//   - autorizado=true  → eth_requestAccounts devuelve la cuenta actual (sin popup).
//   - wallet_revokePermissions → autorizado=false (el sitio queda desconectado).
//   - autorizado=false → eth_requestAccounts devuelve window.__cuentaElegida
//     (lo que el usuario elige en el selector de MetaMask).
// =============================================================================
import { test, expect, type Page } from "@playwright/test";

const A = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"; // Owner (wallet 1)
const B = "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc"; // Ana (otra wallet)

/** Simula MetaMask con permiso retenido + backend (ambas wallets inscritas). */
async function simular(page: Page) {
  await page.addInitScript(
    ([a, b]) => {
      // El estado de autorización PERSISTE entre recargas (como MetaMask real):
      // tras wallet_revokePermissions el sitio queda desconectado aunque recargues.
      let autorizado = localStorage.getItem("truekeate.__revocado") !== "1";
      let cuenta = a;
      const log: string[] = [];
      (window as unknown as Record<string, unknown>).__ethereumLog = log;
      (window as unknown as Record<string, unknown>).__cuentaElegida = null;

      (window as unknown as Record<string, unknown>).ethereum = {
        isMetaMask: true,
        request: async ({ method, params }: { method: string; params?: unknown[] }) => {
          log.push(method);
          if (method === "eth_requestAccounts") {
            // Sitio NO autorizado → MetaMask abre el selector; el usuario elige __cuentaElegida
            if (!autorizado) {
              const elegida = (window as unknown as Record<string, unknown>).__cuentaElegida as string | null;
              cuenta = elegida ?? a;
              autorizado = true;
              localStorage.removeItem("truekeate.__revocado");
            }
            // Sitio autorizado → devuelve la cuenta actual SIN popup (comportamiento real)
            return [cuenta];
          }
          if (method === "eth_accounts") return autorizado ? [cuenta] : [];
          if (method === "eth_chainId") return "0x7a69";
          if (method === "net_version") return "31337";
          if (method === "wallet_revokePermissions") {
            autorizado = false;
            localStorage.setItem("truekeate.__revocado", "1");
            return null;
          }
          if (method === "personal_sign") {
            return "0x" + "33".repeat(65); // firma EIP-191 simulada
          }
          return null;
        },
        on: () => {},
        removeListener: () => {},
      };

      // Sesión previa de la wallet A (conectada e inscrita, token global emitido).
      // Se siembra SOLO la primera vez: localStorage persiste entre recargas reales,
      // así que tras desconectar las claves quedan limpias al recargar.
      if (!localStorage.getItem("truekeate.__sembrado")) {
        localStorage.setItem("truekeate.account", a as string);
        localStorage.setItem("truekeate.token", "tok-a");
        localStorage.setItem("truekeate.token.wallet", a as string);
        localStorage.setItem("truekeate.__sembrado", "1");
      }

      const orig = window.fetch.bind(window);
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const json = (body: unknown, status = 200) =>
          new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
        if (url.includes("/auth/estado")) {
          const w = (new URL(url).searchParams.get("wallet") ?? a).toLowerCase();
          return json({
            inscrito: true,
            usuario: { wallet: w, nombre: w === b ? "Ana" : "Owner", tipo: "PARTICULAR", nivel: "INICIADO", estado: "CERTIFICADO" },
          });
        }
        if (url.includes("/auth/session")) {
          return json({ token: "tok-sesion", usuario: { wallet: cuenta, tipo: "PARTICULAR", nivel: "INICIADO", estado: "CERTIFICADO" } });
        }
        if (url.includes("/truekes/ofertas")) return json({ truekes: [] });
        if (url.includes("/truekes")) return json({ truekes: [] });
        if (url.includes("/catalog")) return json({ articulos: [] });
        if (url.includes("/reputacion/mi")) {
          return json({ puntaje: 70, nivel: "COMUN", medalla: "ORO", oroHistorico: false, metricas: { reputacionMedia: 4.5, efectivos: 3, apelaciones: 0 }, formula: "f" });
        }
        if (url.includes("/disputas")) return json({ disputas: [] });
        return orig(input, init);
      };
    },
    [A, B] as unknown as string[]
  );
}

test.describe("Desconectar billetera y reconectar con OTRA wallet", () => {
  test("Desconectar limpia sesión y permisos; reconectar elige la wallet nueva (no la anterior)", async ({ page }) => {
    await simular(page);

    // 1) Sesión activa de la wallet A (token global ya emitido) → dashboard
    await page.goto("/suite/dashboard");
    await expect(page.getByRole("heading", { name: "Mi Trueke Central" })).toBeVisible();

    // 2) Desconectar desde el menú de usuario
    await page.getByRole("button", { name: "Menú de usuario" }).click();
    await page.getByRole("button", { name: /Desconectar billetera/ }).click();

    // 3) La suite queda bloqueada (guard) y el almacenamiento local se limpia
    await expect(page.getByRole("heading", { name: /Conecta tu billetera para continuar/ })).toBeVisible();
    const ls = await page.evaluate(() => ({
      token: localStorage.getItem("truekeate.token"),
      account: localStorage.getItem("truekeate.account"),
      wallet: localStorage.getItem("truekeate.token.wallet"),
    }));
    expect(ls.token).toBeNull();
    expect(ls.account).toBeNull();
    expect(ls.wallet).toBeNull();

    // 4) La desconexión revocó el permiso eth_accounts en MetaMask
    //    (sin esto, eth_requestAccounts devolvería A sin mostrar el selector)
    const revoco = await page.evaluate(() =>
      ((window as unknown as Record<string, unknown>).__ethereumLog as string[]).includes("wallet_revokePermissions")
    );
    expect(revoco).toBeTruthy();

    // 5) Una recarga NO revive la wallet anterior (desconexión persistente:
    //    estado local limpio + permiso revocado en MetaMask)
    await page.reload();
    await expect(page.getByRole("heading", { name: /Conecta tu billetera para continuar/ })).toBeVisible();

    // 6) El usuario elige OTRA wallet (B) en el selector de MetaMask → se conecta como B
    await page.evaluate((b) => {
      (window as unknown as Record<string, unknown>).__cuentaElegida = b;
    }, B);
    // Hay un botón de conexión rápida en el banner y otro en la pantalla principal
    // del guard: se pulsa el de la pantalla principal (dentro de <main>).
    await page
      .getByRole("main")
      .getByRole("button", { name: /Conectar MetaMask e iniciar sesión/ })
      .click();

    // El login único firma con B (inscrita) → dashboard con la sesión de B
    await expect(page.getByRole("heading", { name: "Mi Trueke Central" })).toBeVisible();
    const menu = page.getByRole("button", { name: "Menú de usuario" });
    await expect(menu).toContainText("0x3c44"); // B corta (en minúsculas, como se normaliza)
    await expect(menu).not.toContainText("0xf39f"); // NUNCA la wallet anterior

    // Token global ligado a la wallet B
    const wallet = await page.evaluate(() => localStorage.getItem("truekeate.token.wallet"));
    expect(wallet).toBe(B);
  });
});
