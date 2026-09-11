// =============================================================================
// Cliente de API del frontend (web/lib/api.ts)
// Cubre el contrato con el backend: URL base, cabecera Bearer, propagación del
// código de estado y los respaldos tolerantes a fallos que evitan pantallas en
// blanco (el enunciado los pedía explícitamente en su fase 11).
// =============================================================================
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  API_URL,
  adminContratos,
  consultarEstado,
  obtenerCatalogo,
} from "../lib/api";

function respuesta(cuerpo: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => cuerpo } as Response;
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("API_URL", () => {
  test("usa el backend local cuando no hay NEXT_PUBLIC_API_URL", () => {
    expect(API_URL).toBe("http://127.0.0.1:4000");
  });
});

describe("obtenerCatalogo", () => {
  test("devuelve los artículos del backend", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      respuesta({ articulos: [{ id: 1, titulo: 'Tablet' }] })
    );
    const arts = await obtenerCatalogo();
    expect(arts).toEqual([{ id: 1, titulo: 'Tablet' }]);
  });

  test("si el backend omite `articulos`, devuelve un array vacío (nunca undefined)", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(respuesta({}));
    expect(await obtenerCatalogo()).toEqual([]);
  });

  test("pide la ruta pública sin cabecera de autorización", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(respuesta({ articulos: [] }));
    await obtenerCatalogo();
    const [url, opciones] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe(`${API_URL}/catalog`);
    expect(opciones?.headers?.Authorization).toBeUndefined();
  });
});

describe("consultarEstado", () => {
  test("devuelve el estado de inscripción", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      respuesta({ inscrito: true, usuario: { wallet: "0xabc", tipo: "PARTICULAR", nivel: "COMUN", estado: "VERIFICADO" } })
    );
    const r = await consultarEstado("0xabc");
    expect(r.inscrito).toBe(true);
    expect(r.usuario?.estado).toBe("VERIFICADO");
  });

  test("codifica la wallet en la URL", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(respuesta({ inscrito: false, usuario: null }));
    await consultarEstado("0xAbC");
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(`${API_URL}/auth/estado?wallet=0xAbC`);
  });

  test("si el backend falla, degrada a «no inscrito» en vez de romper la pantalla", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("sin red"));
    expect(await consultarEstado("0xabc")).toEqual({ inscrito: false, usuario: null });
  });

  test("un 500 tampoco propaga excepción", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(respuesta({ error: "boom" }, false, 500));
    expect(await consultarEstado("0xabc")).toEqual({ inscrito: false, usuario: null });
  });
});

describe("peticiones autenticadas", () => {
  test("envía el token como Bearer", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(respuesta({ contratos: {} }));
    await adminContratos("tok-123");
    const [url, opciones] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe(`${API_URL}/admin/contratos`);
    expect(opciones.headers.Authorization).toBe("Bearer tok-123");
  });

  test("propaga el estado HTTP en el error para que la UI reaccione (401/403)", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(respuesta({ error: "no_autorizado" }, false, 403));
    await expect(adminContratos("tok-malo")).rejects.toMatchObject({ message: "no_autorizado", status: 403 });
  });
});
