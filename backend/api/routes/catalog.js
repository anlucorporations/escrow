// =============================================================================
// TrueKeate — Router /catalog (Ciclo 6)
// Publicaciones AtoA (RF-04, CU-06), encargos (CU-07) y consulta de catálogo
// (CU-08). Reglas: el nivel manda sobre el tipo (D14); Particular ≤5 artículos
// (RF-04.2); Verificado ≤3 trueques activos (RF-14.4) se valida en truekes.
// El GET /catalog es público (wallet conectada sin inscribir puede observar
// ofertas — decisión del director; RF-14.3).
// =============================================================================
import { Router } from 'express';
import { requiereSesion, requiereEstado, requiereFirmaAccion } from '../lib/auth.js';

const LIMITE_ARTICULOS_POR_NIVEL = { INICIADO: 5, COMUN: 50, FRECUENTE: 100, SOCIO: 100 };

export function crearRouterCatalog({ almacen, minteadorNft }) {
  const r = Router();

  // POST /catalog/articulos — publicar artículo AtoA (requiere Verificado; RF-14.4/D14)
  r.post('/articulos', requiereSesion(almacen), requiereEstado(almacen, 'VERIFICADO', 'CERTIFICADO'), requiereFirmaAccion('publicar artículo'), async (req, res) => {
    const u = await almacen.getUsuario(req.wallet);
    const { titulo, descripcion, rubro, categoria, nftTokenId, imagenes } = req.body;
    if (!titulo || !rubro) return res.status(400).json({ error: 'titulo_y_rubro_requeridos' });
    const imgs = Array.isArray(imagenes) ? imagenes.slice(0, 5) : [];
    for (const im of imgs) {
      if (!im || typeof im.data !== 'string' || typeof im.mime !== 'string') {
        return res.status(400).json({ error: 'imagen_invalida', detalle: 'cada imagen: { data: base64, mime }' });
      }
    }
    const CATEGORIAS = ['ARTICULO', 'SERVICIO', 'BIEN', 'CRIPTO'];
    if (categoria && !CATEGORIAS.includes(categoria)) {
      return res.status(400).json({ error: 'categoria_invalida', detalle: CATEGORIAS.join('/') });
    }

    const limite = LIMITE_ARTICULOS_POR_NIVEL[u.nivel] ?? 5;
    const todos = await almacen.listarArticulos();
    const propios = todos.filter((a) => (a.wallet ?? a.usuarioWallet) === req.wallet && a.disponible !== false).length;
    if (propios >= limite) {
      return res.status(403).json({ error: 'limite_articulos', detalle: `máximo ${limite} para nivel ${u.nivel}` });
    }

    const articulo = await almacen.crearArticulo({
      wallet: req.wallet, titulo, descripcion, rubro, categoria: categoria ?? 'ARTICULO', nftTokenId: nftTokenId ?? null, disponible: true,
    });

    // Punto 1 del director: guardar las imágenes del artículo (1..N)
    const imagenesGuardadas = [];
    for (const im of imgs) {
      try {
        const buf = Buffer.from(im.data, 'base64');
        const idImg = await almacen.guardarImagenArticulo({
          articuloId: articulo.id, wallet: req.wallet, contenido: buf, mime: im.mime,
        });
        imagenesGuardadas.push({ id: idImg, url: `/catalog/${articulo.id}/imagen/${idImg}` });
      } catch (e) {
        console.error('[catalog] imagen no guardada:', e.message);
      }
    }

    // Lógica maestra punto 1: cada ítem se convierte en un NFT (lo mintea la plataforma).
    // Con red on-chain configurada → mint real; sin red → token simulado (aviso).
    let minteo = null;
    if (minteadorNft) {
      try {
        const uri = `data:application/json,${encodeURIComponent(JSON.stringify({
          name: titulo,
          description: descripcion ?? '',
          rubro,
          categoria: categoria ?? 'ARTICULO',
        }))}`;
        minteo = await minteadorNft.mintear(req.wallet, categoria ?? 'ARTICULO', uri);
        if (minteo.nftTokenId !== null) {
          await almacen.fijarNftToken(articulo.id, minteo.nftTokenId);
          articulo.nftTokenId = minteo.nftTokenId;
        }
      } catch (e) {
        minteo = { error: e instanceof Error ? e.message : 'minteo fallido' };
        console.error('[catalog] minteo del artículo falló:', minteo.error);
      }
    }

    res.status(201).json({
      articulo: { ...articulo, imagenes: imagenesGuardadas },
      imagenes: imagenesGuardadas,
      nft: minteo
        ? { tokenId: minteo.nftTokenId, simulado: Boolean(minteo.simulado), txHash: minteo.txHash ?? null, aviso: minteo.simulado ? 'sin red on-chain: token simulado (se minteará en producción)' : null }
        : null,
    });
  });

  // GET /catalog — catálogo público (wallet conectada puede ver ofertas — RF-14.3)
  r.get('/', async (_req, res) => {
    const todos = await almacen.listarArticulos();
    const visibles = todos.filter((a) => a.disponible !== false);
    const conImagenes = await Promise.all(visibles.map(async (a) => {
      let imagenes = [];
      try {
        const lista = (await almacen.listarImagenesArticulo(a.id)) ?? [];
        imagenes = lista.map((i) => ({ id: i.id, url: `/catalog/${a.id}/imagen/${i.id}` }));
      } catch { /* sin imágenes */ }
      return { ...a, imagenes };
    }));
    res.json({ articulos: conImagenes });
  });

  // GET /catalog/:articuloId/imagen/:imagenId — sirve una imagen del artículo (punto 1)
  r.get('/:articuloId/imagen/:imagenId', async (req, res) => {
    try {
      const img = await almacen.getImagen(Number(req.params.imagenId));
      if (!img) return res.status(404).json({ error: 'imagen_inexistente' });
      res.setHeader('Content-Type', img.mime || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(img.contenido);
    } catch (e) {
      res.status(500).json({ error: 'imagen_error' });
    }
  });

  // POST /catalog/:id/despublicar — el dueño retira su artículo del catálogo
  r.post('/:id/despublicar', requiereSesion(almacen), async (req, res) => {
    const id = Number(req.params.id);
    const todos = await almacen.listarArticulos();
    const articulo = todos.find((a) => Number(a.id) === id);
    if (!articulo) return res.status(404).json({ error: 'articulo_inexistente' });
    const dueno = articulo.wallet ?? articulo.usuarioWallet;
    if (!dueno || dueno.toLowerCase() !== req.wallet) {
      return res.status(403).json({ error: 'no_autorizado', detalle: 'solo el dueño puede despublicar' });
    }
    await almacen.despublicarArticulo(id);
    res.json({ ok: true });
  });

  // POST /catalog/encargos — solicitar artículo fuera del mercado (Particular; CU-07)
  r.post('/encargos', requiereSesion(almacen), async (req, res) => {
    const { articuloDeseado, oferta } = req.body;
    if (!articuloDeseado) return res.status(400).json({ error: 'articulo_deseado_requerido' });
    const encargo = await almacen.crearEncargo({ wallet: req.wallet, articuloDeseado, oferta: oferta ?? null });
    res.status(201).json({ encargo });
  });

  // GET /catalog/encargos — listar encargos activos
  r.get('/encargos', async (_req, res) => {
    const encargos = await almacen.listarEncargos();
    res.json({ encargos: encargos.filter((e) => e.estado === 'ACTIVO') });
  });

  return r;
}
