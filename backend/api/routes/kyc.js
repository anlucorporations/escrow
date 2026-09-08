// =============================================================================
// TrueKeate — Router /kyc (Ciclo 6 + SBT/imágenes — decisión del director 2026-09)
// Escalera D28 (CU-02):
//   Etapa 1 (VERIFICACIÓN): código de 6 dígitos al correo (demo sin SMTP).
//   Etapa 2 (CERTIFICACIÓN) — nueva lógica:
//     a) GET  /kyc/sbt             → ¿la wallet posee un SBT de certificación?
//     b) POST /kyc/auto-certificar → si posee SBT: CERTIFICADO automático y la
//                                    plataforma mintea el SBT nativo TrueKeateSBT.
//     c) POST /kyc/submit          → sin SBT: sube DNI/cédula + selfie (imágenes
//                                    reales) → PENDIENTE de revisión humana (Owner).
//     d) POST /kyc/review          → Owner aprueba/rechaza (RF-18.4); al aprobar
//                                    se mintea el SBT nativo de la credencial.
// =============================================================================
import { Router } from 'express';
import { randomInt } from 'node:crypto';
import { ethers } from 'ethers';
import { requiereSesion } from '../lib/auth.js';
import { detectarSbt, mintSbtNativo, uriCertificacion } from '../lib/sbt.js';

const CODIGO_TTL_MS = 10 * 60 * 1000; // 10 minutos
const MIME_OK = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_B64 = 4 * 1024 * 1024; // ~4 MB por imagen (base64)

/** Almacén en memoria de códigos: wallet -> {codigo, expira}. */
const codigos = new Map();

/** Normaliza el objeto kyc devuelto por cualquier almacén. */
function normalizarKyc(k) {
  if (!k) return null;
  return {
    wallet: k.wallet?.toLowerCase?.() ?? null,
    estado: k.estado ?? null,
    revisadoPor: k.revisadoPor ?? null,
    viaSbt: Boolean(k.viaSbt),
    sbtContrato: k.sbtContrato ?? null,
    sbtTokenId: k.sbtTokenId ?? null,
    documentoImgId: k.documentoImgId ?? null,
    selfieImgId: k.selfieImgId ?? null,
    createdAt: k.createdAt ?? null,
  };
}

async function enviarCodigoCorreo(correo, codigo) {
  const user = process.env.KYC_EMAIL_USER;
  const pass = process.env.KYC_EMAIL_PASS;
  if (!user || !pass) {
    return { enviado: false, motivo: 'SMTP no configurado (KYC_EMAIL_USER/PASS) — modo demo' };
  }
  try {
    const { createTransport } = await import('nodemailer');
    const tx = createTransport({
      host: process.env.KYC_EMAIL_HOST || 'smtp.gmail.com',
      port: Number(process.env.KYC_EMAIL_PORT || 465),
      secure: true,
      auth: { user, pass },
    });
    await tx.sendMail({
      from: user,
      to: correo,
      subject: 'TrueKeate — Código de verificación de correo',
      text: `Tu código de verificación TrueKeate es: ${codigo}. Vence en 10 minutos.`,
    });
    return { enviado: true };
  } catch (e) {
    console.error('[kyc] error enviando correo:', e.message);
    return { enviado: false, motivo: e.message };
  }
}

export function crearRouterKyc(deps) {
  const { almacen } = deps;
  const r = Router();

  const proveedorRed = () =>
    deps.proveedor ?? new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://127.0.0.1:8545');
  const sbtNativoDir = () =>
    (process.env.SBT_ADDRESS || (deps.contratos?.TrueKeateSBT?.direccion) || '').toLowerCase();
  const pkPlataforma = () => process.env.RELAYER_PRIVATE_KEY || process.env.MINTER_PRIVATE_KEY || '';
  const dirRegistry = () =>
    deps.registryAddress || deps.contratos?.SociosRegistry?.direccion || null;

  /** ¿req.wallet es el Owner (dueño on-chain del SociosRegistry)? */
  async function esOwner(req) {
    const reg = dirRegistry();
    // Sin registry configurado (dev/tests) no hay verificación on-chain → permitido.
    if (!reg) return true;
    try {
      const c = new ethers.Contract(reg, ['function owner() view returns (address)'], proveedorRed());
      const owner = (await c.owner()).toLowerCase();
      return owner === req.wallet;
    } catch {
      return false;
    }
  }

  // POST /kyc/init — inicia la VERIFICACIÓN (etapa 1)
  r.post('/init', requiereSesion(almacen), async (req, res) => {
    const u = await almacen.getUsuario(req.wallet);
    if (!u) return res.status(404).json({ error: 'usuario_inexistente' });
    if (!u.correo) {
      return res.status(400).json({ error: 'correo_requerido', detalle: 'inscríbete con correo (RF-01.2b)' });
    }
    const codigo = String(randomInt(100000, 999999));
    codigos.set(req.wallet, { codigo, expira: Date.now() + CODIGO_TTL_MS });
    const envio = await enviarCodigoCorreo(u.correo, codigo);
    const k = await almacen.initKyc(req.wallet);
    res.json({
      kyc: normalizarKyc(k),
      aviso: envio.enviado
        ? `Código enviado a ${u.correo} (vence en 10 min)`
        : `Código generado (${envio.motivo})`,
      ...(envio.enviado ? {} : { codigoDemo: codigo }),
    });
  });

  // POST /kyc/verify-codes — valida el código del correo → VERIFICADO (etapa 1)
  r.post('/verify-codes', requiereSesion(almacen), async (req, res) => {
    const { codigoCorreo } = req.body;
    if (!codigoCorreo) {
      return res.status(400).json({ error: 'codigo_requerido', detalle: 'código del correo (etapa 1 — D28)' });
    }
    const pendiente = codigos.get(req.wallet);
    if (!pendiente || pendiente.expira < Date.now()) {
      return res.status(422).json({ error: 'codigo_expirado', detalle: 'solicita un código nuevo (/kyc/init)' });
    }
    if (String(codigoCorreo).trim() !== pendiente.codigo) {
      return res.status(422).json({ error: 'codigo_invalido' });
    }
    codigos.delete(req.wallet);
    const u = await almacen.actualizarUsuario(req.wallet, { estado: 'VERIFICADO' });
    const k = await almacen.actualizarKyc(req.wallet, { etapa: 1 });
    res.json({ usuario: u, kyc: normalizarKyc(k) });
  });

  // GET /kyc/sbt — ¿la wallet posee un SBT de certificación? (punto 1)
  r.get('/sbt', requiereSesion(almacen), async (req, res) => {
    const u = await almacen.getUsuario(req.wallet);
    if (!u) return res.status(404).json({ error: 'usuario_inexistente' });
    const info = await detectarSbt({
      provider: proveedorRed(),
      nativoDir: sbtNativoDir(),
      wallet: req.wallet,
    });
    res.json({ ...info, estado: u.estado });
  });

  // POST /kyc/auto-certificar — con SBT → CERTIFICADO automático + SBT nativo (punto 2)
  r.post('/auto-certificar', requiereSesion(almacen), async (req, res) => {
    const u = await almacen.getUsuario(req.wallet);
    if (!u) return res.status(404).json({ error: 'usuario_inexistente' });
    if (u.estado === 'CERTIFICADO') {
      const k = await almacen.getKyc(req.wallet);
      return res.json({ ok: true, yaCertificado: true, usuario: u, kyc: normalizarKyc(k) });
    }
    if (u.estado !== 'VERIFICADO') {
      return res.status(409).json({ error: 'estado_no_verificado', detalle: 'primero completa la verificación de correo (D28)' });
    }
    const sbt = await detectarSbt({ provider: proveedorRed(), nativoDir: sbtNativoDir(), wallet: req.wallet });
    if (!sbt.tieneSbt) {
      return res.status(422).json({ error: 'sin_sbt', detalle: 'tu wallet no posee un SBT de certificación; sube tus documentos (DNI + selfie)' });
    }
    // Minteo del SBT nativo como credencial (si la wallet aún no lo tiene)
    let minteo = null;
    if (sbt.fuente !== 'nativo') {
      minteo = await mintSbtNativo({
        provider: proveedorRed(),
        nativoDir: sbtNativoDir(),
        pkMinter: pkPlataforma(),
        wallet: req.wallet,
        uri: uriCertificacion(req.wallet, sbt.fuente, sbt.tokenId),
      });
    }
    const tokenIdFinal = sbt.fuente === 'nativo' ? sbt.tokenId : minteo?.tokenId ?? null;
    const contratoFinal = sbt.fuente === 'nativo' ? sbt.contrato : sbtNativoDir() || null;
    const revisadoPor = pkPlataforma()
      ? new ethers.Wallet(pkPlataforma()).address.toLowerCase()
      : null;
    // Asegura la fila kyc
    let k = await almacen.getKyc(req.wallet);
    if (!k) k = await almacen.initKyc(req.wallet);
    await almacen.actualizarUsuario(req.wallet, { estado: 'CERTIFICADO' });
    k = await almacen.actualizarKyc(req.wallet, {
      estado: 'APROBADO',
      revisadoPor,
      viaSbt: true,
      sbtContrato: contratoFinal,
      sbtTokenId: tokenIdFinal,
    });
    res.json({ ok: true, usuario: await almacen.getUsuario(req.wallet), kyc: normalizarKyc(k), sbt: { ...sbt, minteoNativo: minteo } });
  });

  // POST /kyc/submit — sin SBT: sube DNI/cédula + selfie (imágenes reales) → PENDIENTE
  r.post('/submit', requiereSesion(almacen), async (req, res) => {
    const { documento, selfie } = req.body ?? {};
    const img = (x) => (x && typeof x.data === 'string' && typeof x.mime === 'string' ? x : null);
    const d = img(documento);
    const s = img(selfie);
    if (!d || !s) {
      return res.status(400).json({ error: 'documento_y_selfie_requeridos', detalle: 'cada imagen: { data: base64, mime }' });
    }
    if (!MIME_OK.has(d.mime) || !MIME_OK.has(s.mime)) {
      return res.status(400).json({ error: 'mime_invalido', detalle: 'usa JPEG/PNG/WebP' });
    }
    if (d.data.length > MAX_B64 || s.data.length > MAX_B64) {
      return res.status(413).json({ error: 'imagen_demasiado_grande', detalle: 'máximo ~4 MB por imagen' });
    }
    const u = await almacen.getUsuario(req.wallet);
    if (!u) return res.status(404).json({ error: 'usuario_inexistente' });
    let k = await almacen.getKyc(req.wallet);
    if (!k) k = await almacen.initKyc(req.wallet);
    const refId = k?.id ?? 0;
    const idDoc = await almacen.guardarImagen({
      tipo: 'KYC_DNI', refId, wallet: req.wallet, contenido: Buffer.from(d.data, 'base64'), mime: d.mime,
    });
    const idSelfie = await almacen.guardarImagen({
      tipo: 'KYC_SELFIE', refId, wallet: req.wallet, contenido: Buffer.from(s.data, 'base64'), mime: s.mime,
    });
    k = await almacen.actualizarKyc(req.wallet, {
      estado: 'PENDIENTE',
      documentoImgId: idDoc,
      selfieImgId: idSelfie,
    });
    res.json({ kyc: normalizarKyc(k), aviso: 'KYC enviado — pendiente de revisión humana del Owner (RF-18.4)' });
  });

  // GET /kyc/imagen/:imagenId — sirve una imagen KYC (dueño u Owner)
  r.get('/imagen/:imagenId', requiereSesion(almacen), async (req, res) => {
    const img = await almacen.getImagen(Number(req.params.imagenId));
    if (!img) return res.status(404).json({ error: 'imagen_inexistente' });
    const propietario = (img.wallet || '').toLowerCase();
    const ownerOk = await esOwner(req);
    if (propietario !== req.wallet && !ownerOk) {
      return res.status(403).json({ error: 'no_autorizado' });
    }
    res.setHeader('Content-Type', img.mime || 'image/jpeg');
    res.setHeader('Cache-Control', 'private, max-age=600');
    res.send(img.contenido);
  });

  // GET /kyc/pendientes — Owner: solicitudes KYC en revisión (RF-18.4)
  r.get('/pendientes', requiereSesion(almacen), async (req, res) => {
    if (!(await esOwner(req))) return res.status(403).json({ error: 'solo_owner' });
    const pendientes = await almacen.listarKycPendientes();
    res.json({
      pendientes: pendientes.map((p) => ({
        ...p,
        urlDocumento: p.documentoImgId ? `/kyc/imagen/${p.documentoImgId}` : null,
        urlSelfie: p.selfieImgId ? `/kyc/imagen/${p.selfieImgId}` : null,
      })),
    });
  });

  // POST /kyc/review — Owner aprueba/rechaza (RF-18.4); al aprobar mintea SBT nativo
  r.post('/review', requiereSesion(almacen), async (req, res) => {
    if (!(await esOwner(req))) return res.status(403).json({ error: 'solo_owner' });
    const { wallet, aprobar } = req.body;
    const w = (wallet || '').toLowerCase();
    const u = await almacen.getUsuario(w);
    if (!u) return res.status(404).json({ error: 'usuario_inexistente' });
    let k = await almacen.getKyc(w);
    if (!k) k = await almacen.initKyc(w);
    if (aprobar) {
      const minteo = await mintSbtNativo({
        provider: proveedorRed(),
        nativoDir: sbtNativoDir(),
        pkMinter: pkPlataforma(),
        wallet: w,
        uri: uriCertificacion(w, 'documentos', k?.sbtTokenId ?? null),
      });
      await almacen.actualizarUsuario(w, { estado: 'CERTIFICADO' });
      k = await almacen.actualizarKyc(w, {
        estado: 'APROBADO',
        revisadoPor: req.wallet,
        sbtContrato: sbtNativoDir() || null,
        sbtTokenId: minteo?.tokenId ?? k?.sbtTokenId ?? null,
      });
      res.json({ usuario: await almacen.getUsuario(w), kyc: normalizarKyc(k), sbt: minteo });
    } else {
      k = await almacen.actualizarKyc(w, { estado: 'RECHAZADO', revisadoPor: req.wallet });
      res.status(422).json({ error: 'kyc_rechazado', kyc: normalizarKyc(k) });
    }
  });

  // GET /kyc/status — estado de la verificación/certificación
  r.get('/status', requiereSesion(almacen), async (req, res) => {
    const u = await almacen.getUsuario(req.wallet);
    const k = await almacen.getKyc(req.wallet);
    res.json({ estado: u?.estado ?? null, kyc: normalizarKyc(k) });
  });

  return r;
}
