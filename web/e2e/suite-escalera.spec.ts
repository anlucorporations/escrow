// =============================================================================
// TrueKeate — E2E Escalera D28: Verificación (código correo) y Certificación (KYC)
// Con wallet simulada (INSCRITO/VERIFICADO) y backend mockeado:
//   - /suite/verificacion envía el código (codigoDemo) y lo confirma → VERIFICADO
//   - /suite/certificacion envía documento+selfie → PENDIENTE de revisión Owner
// =============================================================================
import { test, expect, type Page } from "@playwright/test";

const CUENTA = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";

interface UsuarioSim {
  tipo: "PARTICULAR" | "EMPRESA" | "SOCIO";
  nivel: "INICIADO" | "COMUN" | "FRECUENTE" | "SOCIO";
  estado: "INSCRITO" | "VERIFICADO" | "CERTIFICADO";
}

async function simularEscalera(page: Page, usuario: UsuarioSim, codigo: string) {
  await page.addInitScript(
    ([cuenta, usr, cod]) => {
      const usuarioSim = usr as unknown as UsuarioSim;
      let estadoActual = usuarioSim.estado;
      (window as unknown as Record<string, unknown>).ethereum = {
        isMetaMask: true,
        request: async ({ method }: { method: string }) => {
          if (method === "eth_requestAccounts" || method === "eth_accounts") return [cuenta];
          if (method === "eth_chainId") return "0x7a69";
          if (method === "net_version") return "31337";
          if (method === "personal_sign") return "0x" + "11".repeat(65);
          return null;
        },
        on: () => {},
        removeListener: () => {},
      };
      localStorage.setItem("truekeate.account", cuenta as string);

      const orig = window.fetch.bind(window);
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const json = (b: unknown, status = 200) =>
          new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });

        if (url.includes("/auth/estado")) {
          return json({ inscrito: true, usuario: { wallet: cuenta, correo: "usuario@truekeate.test", ...usuarioSim, estado: estadoActual } });
        }
        if (url.includes("/auth/session")) {
          return json({ token: "tok-d28", usuario: { wallet: cuenta, ...usuarioSim, estado: estadoActual } });
        }
        if (url.includes("/kyc/status")) {
          return json({ estado: estadoActual, kyc: null });
        }
        if (url.includes("/kyc/init") && init?.method === "POST") {
          return json({ kyc: null, aviso: "código generado (demo)", codigoDemo: cod });
        }
        if (url.includes("/kyc/verify-codes") && init?.method === "POST") {
          estadoActual = "VERIFICADO";
          return json({ usuario: { wallet: cuenta, tipo: "PARTICULAR", nivel: "INICIADO", estado: "VERIFICADO" }, kyc: null });
        }
        if (url.includes("/kyc/submit") && init?.method === "POST") {
          return json({ kyc: { estado: "PENDIENTE" }, aviso: "KYC enviado — pendiente de revisión" });
        }
        return orig(input, init);
      };
    },
    [CUENTA, usuario, codigo] as unknown as string[]
  );
}

test.describe("Escalera D28 — Verificación y Certificación", () => {
  test("Verificación: enviar código del correo y confirmar → VERIFICADO", async ({ page }) => {
    await simularEscalera(page, { tipo: "PARTICULAR", nivel: "INICIADO", estado: "INSCRITO" }, "482913");
    await page.goto("/suite/verificacion");
    await expect(page.getByRole("heading", { name: /Verificación de identidad/ })).toBeVisible();
    // Iniciar sesión (firma única)
    const btnLogin = page.getByRole("button", { name: /Iniciar sesión|Autenticar/ });
    if (await btnLogin.isVisible().catch(() => false)) await btnLogin.click();
    // Enviar el código
    await expect(page.getByRole("button", { name: /Enviar código a mi correo/ })).toBeVisible();
    await page.getByRole("button", { name: /Enviar código a mi correo/ }).click();
    // Modo demo: se muestra el código
    await expect(page.getByText("482913")).toBeVisible();
    // Confirmar → estado VERIFICADO
    await page.getByLabel("Código de verificación del correo").fill("482913");
    await page.getByRole("button", { name: /Confirmar código/ }).click();
    await expect(page.getByText("¡Correo verificado!")).toBeVisible();
  });

  test("Certificación: Verificado envía documento y selfie (KYC) → PENDIENTE", async ({ page }) => {
    await simularEscalera(page, { tipo: "PARTICULAR", nivel: "INICIADO", estado: "VERIFICADO" }, "000000");
    await page.goto("/suite/certificacion");
    await expect(page.getByRole("heading", { name: /Certificación \(KYC\)/ })).toBeVisible();
    const btnLogin = page.getByRole("button", { name: /Iniciar sesión|Autenticar/ });
    if (await btnLogin.isVisible().catch(() => false)) await btnLogin.click();
    // Espera el formulario (tras el login) y llénalo
    const botonEnviar = page.getByRole("button", { name: /Enviar KYC/ });
    await expect(botonEnviar).toBeVisible({ timeout: 10_000 });
    await page.locator("#doc").fill("ipfs://doc-abc");
    await page.locator("#selfie").fill("ipfs://selfie-abc");
    await expect(botonEnviar).toBeEnabled();
    await botonEnviar.click();
    await expect(page.getByText("KYC enviado")).toBeVisible();
    await expect(page.getByText(/pendiente de revisión humana del Owner/)).toBeVisible();
  });

  test("Escudo de estado: un INSCRITO ve el escudo amarillo que lleva a Verificación", async ({ page }) => {
    await simularEscalera(page, { tipo: "PARTICULAR", nivel: "INICIADO", estado: "INSCRITO" }, "000000");
    await page.goto("/suite/dashboard");
    const escudo = page.getByRole("link", { name: /Escudo de estado: INSCRITO/ });
    await expect(escudo).toBeVisible();
    await escudo.click();
    await expect(page).toHaveURL(/\/suite\/verificacion/);
  });
});
