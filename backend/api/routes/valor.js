// =============================================================================
// TrueKeate — Router /valor (ex "Finanzas" — rediseño del director 2026-09-09)
// =============================================================================
// VALOR tiene 3 subsecciones:
//   4.1 Criptos de cada socio (Recargar / Retirar / Convertir): los movimientos
//       ocurren SIEMPRE entre el usuario y la PLATAFORMA como contraparte; no hay
//       transferencia P2P directa de cripto — entre socios la cripto solo se
//       mueve a través de un Trueke (el flujo de trueque ya custodia/libera).
//   4.2 Reputación: puntaje D12/D30 + trueques COMPLETADOS sin valorar (el socio
//       valora 1-5 desde aquí) + los últimos 10 trueques con su valoración.
//   4.3 BRLT (Recargar / Retirar / Convertir): la RECARGA con fiat usa Stripe
//       Checkout ALQUILADO por Stripe (no se construye pasarela propia); el
//       webhook confirma y acredita BRLT. Retiro a fiat = Stripe Payouts
//       (documentado; en este entorno se registra y se advierte). Solo
//       Empresa/SOCIO/Owner gestionan BRLT; VALOR es visible para todo inscrito
//       pero con contenido según rol (decisión del director).
//
// Rol:  'PARTICULAR'|'EMPRESA'|'SOCIO' (el Owner se detecta on-chain).
// Tasa interna de conversión ETH↔BRLT (plataforma): TASA_ETH_BRLT env o 3000.
// =============================================================================
import { Router } from 'express';
import { ethers } from 'ethers';
import { requiereSesion } from '../lib/auth.js';
import { crearDetectorOwner } from '../lib/es-owner.js';
import { calcularPuntaje, clasificarNivel } from '../lib/reputacion.js';

const TASA_ETH_BRLT = Number(process.env.TASA_ETH_BRLT || 3000); // 1 ETH ≈ 3000 BRLT (plataforma)

export function crearRouterValor({ almacen, proveedor, registryAddress, ownerWallet, relayer, walletEmpresas }) {
  const r = Router();
  const owner = crearDetectorOwner({ almacen, proveedor, registryAddress, ownerWallet });

  /** Rol ampliado: el Owner (on-chain) cuenta como SOCIO para VALOR. */
  async function rolValor(req) {
    const u = await almacen.getUsuario(req.wallet);
    const esOwner = await owner.esOwner(req.wallet);
    if (esOwner) return 'OWNER';
    return u?.tipo ?? 'PARTICULAR';
  }

  /** Wallet de la PLATAFORMA (contraparte de los movimientos). */
  function walletPlataforma() {
    if (walletEmpresas?.address) return walletEmpresas.address.toLowerCase();
    if (relayer?.wallet?.address) return relayer.wallet.address.toLowerCase();
    return process.env.PLATAFORMA_WALLET?.toLowerCase() || '0x0000000000000000000000000000000000000001';
  }

  const puedeBRLT = async (req) => ['EMPRESA', 'SOCIO', 'OWNER'].includes(await rolValor(req));
  const puedeCriptos = async (req) => ['EMPRESA', 'SOCIO', 'OWNER'].includes(await rolValor(req));

  // GET /valor/mi — resumen VALOR del usuario (subsecciones 4.1/4.2/4.3)
  r.get('/mi', requiereSesion(almacen), async (req, res, next) => {
    try {
      const rol = await rolValor(req);
      const f = await almacen.asegurarFinanzas(req.wallet) ?? {};
      const puedeB = ['EMPRESA', 'SOCIO', 'OWNER'].includes(rol);

      // reputación (misma fórmula D12/D30 que /reputacion/mi)
      const u = await almacen.getUsuario(req.wallet);
      const todos = await almacen.listarTruekes();
      const mios = todos.filter((t) => t.usuarioA === req.wallet || (t.usuarioB && t.usuarioB === req.wallet));
      const completados = mios.filter((t) => t.estado === 'COMPLETADO');
      const valoracionesPrevias = (await almacen.listarValoracionesDe(req.wallet, 100)) ?? [];
      const valoradosIds = new Set(valoracionesPrevias.map((v) => v.truekeId));
      // pendientes: COMPLETADOS donde soy parte y aún no valoré
      const pendientesValoracion = completados
        .filter((t) => !valoradosIds.has(t.id))
        .slice(0, 20)
        .map((t) => ({
          truekeId: t.id,
          tituloA: t.tituloA,
          tituloB: t.tituloB,
          contraparte: t.usuarioA === req.wallet ? t.usuarioB : t.usuarioA,
          completadoEn: t.updatedAt,
        }));

      const reputacionMedia = valoracionesPrevias.length
        ? Math.round((valoracionesPrevias.reduce((a, v) => a + v.promedio, 0) / valoracionesPrevias.length) * 100) / 100
        : 0;
      const volumenMaximo = Math.max(1, completados.length);
      const puntaje = calcularPuntaje({
        reputacionMedia,
        volumenEfectivo: completados.length,
        volumenMaximoSistema: volumenMaximo,
        apelaciones: todos.filter((t) => ['EN_DISPUTA', 'RESOLUCION_SOCIOS'].includes(t.estado) && (t.usuarioA === req.wallet || t.usuarioB === req.wallet)).length,
      });
      const nivel = clasificarNivel(puntaje);

      res.json({
        rol,
        saldos: {
          criptos: puedeB ? (f.criptos ?? {}) : undefined,
          brlt: puedeB ? Number(f.brlt ?? 0) : undefined,
          fondoValor: puedeB ? Number(f.fondoValor ?? 0) : undefined,
        },
        criptosHabilitado: await puedeCriptos(req),
        brltHabilitado: puedeB,
        tasaEthBrlt: TASA_ETH_BRLT,
        reputacion: {
          puntaje,
          nivel: nivel.nivel,
          medalla: nivel.medalla,
          reputacionMedia,
          truequesCompletados: completados.length,
        },
        pendientesValoracion,
        ultimasValoraciones: valoracionesPrevias.slice(0, 10),
        movimientos: (await almacen.listarMovimientosValor(req.wallet, 20)) ?? [],
      });
    } catch (e) { next(e); }
  });

  // =========================================================================
  // 4.1 Criptos — Recargar / Retirar / Convertir (contraparte: la PLATAFORMA)
  // =========================================================================

  /** Registra el movimiento contra la plataforma y ajusta saldo. */
  async function operarCripto(req, res, tipo, moneda, delta, detalle) {
    try {
      if (!(await puedeCriptos(req))) {
        return res.status(403).json({ error: 'solo_empresa_socio', detalle: 'la gestión de criptos es de Empresa/Socio/Owner' });
      }
      const monto = Number(req.body?.monto);
      if (!Number.isFinite(monto) || monto <= 0) {
        return res.status(400).json({ error: 'monto_invalido' });
      }
      const plataforma = walletPlataforma();
      const f = await almacen.moverSaldo(req.wallet, { deltaCripto: { [moneda]: delta * monto } });
      await almacen.registrarMovimientoValor({
        wallet: req.wallet, tipo, moneda, monto,
        contraparte: plataforma,
        detalle: detalle ?? `${tipo} ${moneda}`,
      });
      res.json({ ok: true, saldos: f, tipo, moneda, monto, contraparte: plataforma });
    } catch (e) {
      if (e.message === 'saldo_insuficiente') return res.status(409).json({ error: 'saldo_insuficiente' });
      next(e);
    }
  }

  // POST /valor/criptos/recargar — la plataforma acredita cripto al socio
  r.post('/criptos/recargar', requiereSesion(almacen), async (req, res, next) => {
    await operarCripto(req, res, 'RECARGA_CRIPTO', 'ETH', +1, 'Recarga de ETH (contraparte: la plataforma)');
  });

  // POST /valor/criptos/retirar — el socio retira cripto (lo envía la plataforma)
  r.post('/criptos/retirar', requiereSesion(almacen), async (req, res, next) => {
    await operarCripto(req, res, 'RETIRO_CRIPTO', 'ETH', -1, 'Retiro de ETH hacia tu billetera (la plataforma lo envía)');
  });

  // POST /valor/criptos/convertir — ETH ⇄ BRLT a tasa de la plataforma
  r.post('/criptos/convertir', requiereSesion(almacen), async (req, res, next) => {
    try {
      if (!(await puedeCriptos(req))) {
        return res.status(403).json({ error: 'solo_empresa_socio' });
      }
      const { desde, monto } = req.body ?? {};
      const cantidad = Number(monto);
      if (!['ETH', 'BRLT'].includes(desde) || !Number.isFinite(cantidad) || cantidad <= 0) {
        return res.status(400).json({ error: 'datos_invalidos', detalle: 'desde: ETH|BRLT y monto > 0' });
      }
      const plataforma = walletPlataforma();
      if (desde === 'ETH') {
        const brlt = Math.round(cantidad * TASA_ETH_BRLT * 100) / 100;
        await almacen.moverSaldo(req.wallet, { deltaCripto: { ETH: -cantidad }, deltaBrlt: brlt });
        await almacen.registrarMovimientoValor({ wallet: req.wallet, tipo: 'CONVERSION', moneda: 'ETH→BRLT', monto: cantidad, contraparte: plataforma, detalle: `Convertir ${cantidad} ETH → ${brlt} BRLT (tasa ${TASA_ETH_BRLT})` });
        return res.json({ ok: true, desde: 'ETH', monto: cantidad, resultado: { BRLT: brlt }, tasa: TASA_ETH_BRLT });
      }
      const eth = Math.round((cantidad / TASA_ETH_BRLT) * 1e6) / 1e6;
      await almacen.moverSaldo(req.wallet, { deltaCripto: { ETH: eth }, deltaBrlt: -cantidad });
      await almacen.registrarMovimientoValor({ wallet: req.wallet, tipo: 'CONVERSION', moneda: 'BRLT→ETH', monto: cantidad, contraparte: plataforma, detalle: `Convertir ${cantidad} BRLT → ${eth} ETH (tasa ${TASA_ETH_BRLT})` });
      res.json({ ok: true, desde: 'BRLT', monto: cantidad, resultado: { ETH: eth }, tasa: TASA_ETH_BRLT });
    } catch (e) {
      if (e.message === 'saldo_insuficiente') return res.status(409).json({ error: 'saldo_insuficiente' });
      next(e);
    }
  });

  // =========================================================================
  // 4.3 BRLT — Recargar (Stripe Checkout) / Retirar (Payouts doc) / Convertir
  // =========================================================================

  // POST /valor/brlt/checkout — crea una Stripe Checkout Session (compra BRLT con fiat)
  r.post('/brlt/checkout', requiereSesion(almacen), async (req, res, next) => {
    try {
      if (!(await puedeBRLT(req))) {
        return res.status(403).json({ error: 'solo_empresa_socio_owner', detalle: 'BRLT es de Empresa/Socio/Owner' });
      }
      const montoBRLT = Number(req.body?.montoBRLT);
      const precioBRLT = Number(req.body?.precioBRLT || 1); // fiat por BRLT (p. ej. 1 BRLT = 1 USD)
      if (!Number.isFinite(montoBRLT) || montoBRLT <= 0) {
        return res.status(400).json({ error: 'monto_invalido' });
      }
      const montoFiat = Math.round(montoBRLT * precioBRLT * 100); // centavos

      const stripeKey = process.env.STRIPE_SECRET_KEY || '';
      if (!stripeKey) {
        // Sin clave Stripe (dev): se registra como PENDIENTE y se avisa (demo).
        const idDemo = await almacen.crearMovimientoBrlt({ wallet: req.wallet, montoBrlt: montoBRLT, montoFiat: montoFiat / 100, fiatMoneda: 'usd', stripeSession: null });
        return res.status(503).json({ error: 'stripe_no_configurado', detalle: 'STRIPE_SECRET_KEY ausente; movimiento #' + idDemo + ' registrado como demo', movimientoId: idDemo });
      }
      // Stripe Checkout alojado (NO pasarela propia)
      const stripe = (await import('stripe')).default;
      const cliente = new stripe(stripeKey);
      const session = await cliente.checkout.sessions.create({
        mode: 'payment',
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: { name: `${montoBRLT} BRLT — TrueKeate`, description: 'Compra de BRLT con tarjeta (fiat)' },
            unit_amount: Math.round(montoFiat / montoBRLT),
          },
          quantity: montoBRLT,
        }],
        metadata: { wallet: req.wallet, montoBRLT: String(montoBRLT) },
        success_url: `${req.headers.origin || 'https://truekeate-web-593453426217.europe-west1.run.app'}/suite/valor?pago=ok`,
        cancel_url: `${req.headers.origin || 'https://truekeate-web-593453426217.europe-west1.run.app'}/suite/valor?pago=cancelado`,
      });
      await almacen.crearMovimientoBrlt({
        wallet: req.wallet, montoBrlt: montoBRLT,
        montoFiat: session.amount_total ? session.amount_total / 100 : montoFiat / 100,
        fiatMoneda: 'usd', stripeSession: session.id,
      });
      res.json({ ok: true, url: session.url, sessionId: session.id, montoBRLT });
    } catch (e) {
      console.error('[valor] checkout Stripe:', e.message);
      res.status(500).json({ error: 'stripe_error', detalle: e.message });
    }
  });

  // POST /valor/brlt/webhook — Stripe confirma el pago → acredita BRLT
  // (sin sesión: Stripe firma; se valida con STRIPE_WEBHOOK_SECRET si existe)
  r.post('/brlt/webhook', async (req, res) => {
    try {
      const stripeKey = process.env.STRIPE_SECRET_KEY || '';
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
      let evento;
      if (stripeKey && webhookSecret) {
        const stripe = (await import('stripe')).default;
        const cliente = new stripe(stripeKey);
        const firma = req.headers['stripe-signature'];
        evento = cliente.webhooks.constructEvent(req.body, firma, webhookSecret);
      } else {
        // sin clave/secret (dev/test): se confía en el payload con el tipo esperado
        evento = req.body;
      }
      const objeto = evento?.data?.object ?? evento;
      if ((evento?.type === 'checkout.session.completed' || objeto?.payment_status === 'paid') && objeto?.id) {
        const pendiente = await almacen.buscarMovimientoBrltPorSesion?.(objeto.id);
        if (pendiente && pendiente.estado === 'PENDIENTE') {
          const confirmado = await almacen.confirmarMovimientoBrlt(pendiente.id, { stripePayment: objeto.payment_intent ?? objeto.id });
          if (confirmado) {
            console.log(`[valor] webhook: ${confirmado.montoBrlt} BRLT acreditados a ${confirmado.wallet}`);
          }
        } else {
          console.warn('[valor] webhook: sesión no encontrada o ya procesada:', objeto.id);
        }
      }
      res.json({ recibido: true });
    } catch (e) {
      console.error('[valor] webhook:', e.message);
      res.status(400).json({ error: 'webhook_error', detalle: e.message });
    }
  });

  // POST /valor/brlt/retirar — retiro de BRLT (registro + aviso Payouts)
  r.post('/brlt/retirar', requiereSesion(almacen), async (req, res, next) => {
    try {
      if (!(await puedeBRLT(req))) {
        return res.status(403).json({ error: 'solo_empresa_socio_owner' });
      }
      const monto = Number(req.body?.monto);
      if (!Number.isFinite(monto) || monto <= 0) {
        return res.status(400).json({ error: 'monto_invalido' });
      }
      const plataforma = walletPlataforma();
      const f = await almacen.moverSaldo(req.wallet, { deltaBrlt: -monto });
      await almacen.registrarMovimientoValor({
        wallet: req.wallet, tipo: 'RETIRO_BRLT', moneda: 'BRLT', monto,
        contraparte: plataforma,
        detalle: 'Retiro BRLT→fiat: requiere Stripe Payouts (cuenta Stripe conectada). En este entorno se registra la salida.',
      });
      res.json({ ok: true, saldos: f, aviso: 'El desembolso fiat real se ejecuta por Stripe Payouts cuando la cuenta esté vinculada.' });
    } catch (e) {
      if (e.message === 'saldo_insuficiente') return res.status(409).json({ error: 'saldo_insuficiente' });
      next(e);
    }
  });

  return r;
}
