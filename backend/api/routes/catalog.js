// =============================================================================
// TrueKeate — Router /catalog (Ciclo 6)
// Publicaciones AtoA (RF-04, CU-06), encargos (CU-07) y consulta de catálogo
// (CU-08). Reglas: el nivel manda sobre el tipo (D14); Particular ≤5 artículos
// (RF-04.2); Verificado ≤3 trueques activos (RF-14.4) se valida en truekes.
// =============================================================================
import { Router } from 'express';
import { requiereSesion, requiereEstado } from '../lib/auth.js';

const LIMITE_ARTICULOS_POR_NIVEL = { INICIADO: 5, COMUN: 50, FRECUENTE: 100, SOCIO: 100 };

export function crearRouterCatalog({ almacen }) {
  const r = Router();

  // POST /catalog/articulos — publicar artículo AtoA (requiere Verificado; RF-14.4/D14)
  r.post('/articulos', requiereSesion(almacen), requiereEstado(almacen, 'VERIFICADO', 'CERTIFICADO'), (req, res) => {
    const u = almacen.getUsuario(req.wallet);
    const { titulo, descripcion, rubro, nftTokenId } = req.body;
    if (!titulo || !rubro) return res.status(400).json({ error: 'titulo_y_rubro_requeridos' });

    const limite = LIMITE_ARTICULOS_POR_NIVEL[u.nivel] ?? 5;
    const propios = almacen.listarArticulos().filter((a) => a.wallet === req.wallet && a.disponible !== false).length;
    if (propios >= limite) {
      return res.status(403).json({ error: 'limite_articulos', detalle: `máximo ${limite} para nivel ${u.nivel}` });
    }

    const articulo = almacen.crearArticulo({
      wallet: req.wallet, titulo, descripcion, rubro, nftTokenId: nftTokenId ?? null, disponible: true,
    });
    res.status(201).json({ articulo });
  });

  // GET /catalog — catálogo público (el Inscrito puede ver ofertas — RF-14.3)
  r.get('/', (_req, res) => {
    res.json({ articulos: almacen.listarArticulos().filter((a) => a.disponible) });
  });

  // POST /catalog/encargos — solicitar artículo fuera del mercado (Particular; CU-07)
  r.post('/encargos', requiereSesion(almacen), (req, res) => {
    const { articuloDeseado, oferta } = req.body;
    if (!articuloDeseado) return res.status(400).json({ error: 'articulo_deseado_requerido' });
    const encargo = almacen.crearEncargo({ wallet: req.wallet, articuloDeseado, oferta: oferta ?? null });
    res.status(201).json({ encargo });
  });

  // GET /catalog/encargos — listar encargos activos
  r.get('/encargos', (_req, res) => {
    res.json({ encargos: almacen.listarEncargos().filter((e) => e.estado === 'ACTIVO') });
  });

  return r;
}
