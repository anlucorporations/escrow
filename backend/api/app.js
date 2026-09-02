// =============================================================================
// TrueKeate — Backend API (Ciclo 6, Fase 3)
// Fuente: RepoTecnico/arquitectura_tecnica.md §7
//
// API REST/JSON en Node.js (Express). Módulos:
//   - auth: registro/inscripción ERC-4337, sesión por firma, escalera D28 (CU-01/02)
//   - kyc: verificación en 2 etapas (correo+teléfono → VERIFICADO; documento+selfie →
//     CERTIFICADO) con revisión humana del Owner (RF-18.4)
//   - catalog: publicaciones AtoA y encargos (RF-04, CU-06/07/08)
//   - truekes: orquesta intents EIP-712 hacia el Escrow vía el relayer (CU-11…15)
//   - admin: dashboard del Owner (RF-13.1)
//
// Autenticación: firma EIP-191 de sesión + JWT corto (ver lib/auth.js). Rate-limiting
// global y por usuario (D16/RF-09.6). En C6 los datos viven en un almacén en memoria
// (puente hacia PostgreSQL en la integración C8).
// =============================================================================
import express from 'express';
import rateLimit from 'express-rate-limit';
import { crearRouterAuth } from './routes/auth.js';
import { crearRouterKyc } from './routes/kyc.js';
import { crearRouterCatalog } from './routes/catalog.js';
import { crearRouterTruekes } from './routes/truekes.js';
import { crearRouterAdmin } from './routes/admin.js';

/**
 * Crea la aplicación Express.
 * @param {object} deps { almacen, relayer?, escrowAbi?, contratos? }
 */
export function crearApp(deps = {}) {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // rate-limiting global (D16/RF-09.6)
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 120,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'rate_limit', detalle: 'demasiadas peticiones' },
    })
  );

  app.get('/healthz', (_req, res) => res.json({ ok: true, servicio: 'truekeate-api' }));

  app.use('/auth', crearRouterAuth(deps));
  app.use('/kyc', crearRouterKyc(deps));
  app.use('/catalog', crearRouterCatalog(deps));
  app.use('/truekes', crearRouterTruekes(deps));
  app.use('/admin', crearRouterAdmin(deps));

  // 404 y manejo de errores
  app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    console.error('[api] error:', err.message);
    res.status(err.status || 500).json({ error: err.code || 'internal', detalle: err.message });
  });

  return app;
}

/** Inicia el servidor (para index-api.js). */
export function iniciarServidor(deps, puerto = parseInt(process.env.PORT || '4000', 10)) {
  const app = crearApp(deps);
  const server = app.listen(puerto, () => {
    console.log(`[api] TrueKeate API escuchando en http://127.0.0.1:${puerto}`);
  });
  return { app, server };
}
