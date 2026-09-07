// =============================================================================
// TrueKeate — E2E login ÚNICO (decisión del director)
// Reproduce el reporte: "tras autenticarme en una sección, cada sección me pide
// autenticar de nuevo". El token global (emitido UNA vez al conectar) debe
// persistir entre secciones: al navegar, NO debe reaparecer "Iniciar sesión".
// =============================================================================
import { test, expect, type Page } from "@playwright/test";

const CUENTA = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";

interface UsuarioSim {
  tipo: "PARTICULAR" | "EMPRESA" | "SOCIO";
  nivel: "INICIADO" | "COMUN" | "FRECUENTE" | "SOCIO";
  estado: "INSCRITO" | "VERIFICADO" | "CERTIFICADO";
}

/** Simula wallet + backend. Registra la sesión de autenticación para el test. */
async function simularLoginUnico(page: Page, usuario: UsuarioSim) {
  await page.addInitScript(
    ([cuenta, usr]) => {
      const usuarioSim = usr as unknown as UsuarioSim;
      (window as unknown as Record<string, unknown>).ethereum = {
        isMetaMask: true,
        request: async ({ method }: { method: string }) => {
          if (method === "eth_requestAccounts" || method === "eth_accounts") return [cuenta];
          if (method === "eth_chainId") return "0x7a69";
          if (method === "net_version") return "31337";
          if (method === "personal_sign") return "0x" + "22".repeat(65);
          return null;
        },
        on: () => {},
        removeListener: () => {},
      };
      localStorage.setItem("truekeate.account", cuenta as string);

      const orig = window.fetch.bind(window);
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const json = (body: unknown, status = 200) =>
          new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
        if (url.includes("/auth/estado")) {
          return json({ inscrito: true, usuario: { wallet: cuenta, ...usuarioSim } });
        }
        if (url.includes("/auth/session")) {
          return json({ token: "tok-login-unico", usuario: { wallet: cuenta, ...usuarioSim } });
        }
        if (url.includes("/truekes/ofertas")) return json({ truekes: [] });
        if (url.includes("/truekes") && (!init?.method || init?.method === "GET")) {
          return json({ truekes: [] });
        }
        if (url.includes("/catalog")) return json({ articulos: [] });
        if (url.includes("/reputacion/mi")) {
          return json({ puntaje: 70, nivel: "COMUN", medalla: "ORO", oroHistorico: false, metricas: { reputacionMedia: 4.5, efectivos: 3, apelaciones: 0 }, formula: "f" });
        }
        if (url.includes("/disputas")) return json({ disputas: [] });
        if (url.includes("/puntos-encuentro/favoritos")) return json({ favoritos: [] });
        if (url.includes("/puntos-encuentro/mios")) return json({ puntos: [] });
        return orig(input, init);
      };
    },
    [CUENTA, usuario] as unknown as string[]
  );
}

test.describe("Login único — sin reautenticación por sección", () => {
  test("el guard pide la firma UNA vez y luego no la repite al navegar", async ({ page }) => {
    await simularLoginUnico(page, { tipo: "PARTICULAR", nivel: "INICIADO", estado: "CERTIFICADO" });

    // 1) Entrar a una sección sin token: el guard muestra la ÚNICA pantalla de login
    await page.goto("/suite/perfil");
    await expect(page.getByRole("heading", { name: /Inicia sesión con tu billetera/ })).toBeVisible();

    // 2) Firmar UNA vez (firma EIP-191 → token global) → se muestra la sección
    const btnLogin = page.getByRole("button", { name: /Iniciar sesión \(una firma\)/ });
    await btnLogin.click();
    await expect(page.getByRole("heading", { name: /Mi Perfil/ })).toBeVisible();

    // 3) Navegar a OTRA sección: NO debe volver a pedir la firma
    await page.goto("/suite/dashboard");
    await expect(page.getByRole("heading", { name: "Mi Trueke Central" })).toBeVisible();

    // El botón de autenticación NO debe aparecer (token global ya emitido)
    const btnRepetido = page.getByRole("button", { name: /Iniciar sesión|Autenticar/ });
    await expect(btnRepetido).toHaveCount(0);
  });

  test("con token ya guardado (localStorage), una recarga NO vuelve a pedir la firma", async ({ page }) => {
    await page.addInitScript(
      ([cuenta, usr]) => {
        const usuarioSim = usr as unknown as UsuarioSim;
        (window as unknown as Record<string, unknown>).ethereum = {
          isMetaMask: true,
          request: async ({ method }: { method: string }) => {
            if (method === "eth_requestAccounts" || method === "eth_accounts") return [cuenta];
            if (method === "eth_chainId") return "0x7a69";
            return null;
          },
          on: () => {},
          removeListener: () => {},
        };
        localStorage.setItem("truekeate.account", cuenta as string);
        // Simula que el usuario YA firmó en una sesión anterior
        localStorage.setItem("truekeate.token", "tok-persistente");
        localStorage.setItem("truekeate.token.wallet", cuenta as string);

        const orig = window.fetch.bind(window);
        window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
          const url = String(input);
          const json = (b: unknown) => new Response(JSON.stringify(b), { status: 200, headers: { "Content-Type": "application/json" } });
          if (url.includes("/auth/estado")) return json({ inscrito: true, usuario: { wallet: cuenta, ...usuarioSim } });
          if (url.includes("/auth/session")) return json({ token: "tok-persistente", usuario: { wallet: cuenta, ...usuarioSim } });
          if (url.includes("/truekes/ofertas")) return json({ truekes: [] });
          if (url.includes("/truekes")) return json({ truekes: [] });
          if (url.includes("/catalog")) return json({ articulos: [] });
          if (url.includes("/disputas")) return json({ disputas: [] });
          if (url.includes("/reputacion/mi")) return json({ puntaje: 70, nivel: "COMUN", medalla: "ORO", oroHistorico: false, metricas: { reputacionMedia: 4.5, efectivos: 3, apelaciones: 0 }, formula: "f" });
          return orig(input, init);
        };
      },
      [CUENTA, { tipo: "PARTICULAR", nivel: "INICIADO", estado: "CERTIFICADO" }] as unknown as string[]
    );

    await page.goto("/suite/dashboard");
    await expect(page.getByRole("heading", { name: "Mi Trueke Central" })).toBeVisible();
    const btn = page.getByRole("button", { name: /Iniciar sesión|Autenticar/ });
    await expect(btn).toHaveCount(0);
  });
});
