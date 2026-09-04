// =============================================================================
// TrueKeate — Router /kyc (Ciclo 6 + verificación con código de correo)
// Escalera D28 (CU-02):
//   Etapa 1 (VERIFICACIÓN): se genera un código de 6 dígitos para el correo.
//     - Con SMTP configurado (KYC_EMAIL_USER/PASS) se envía por Nodemailer (D37).
//     - Sin SMTP (demo/desarrollo) el código se devuelve en la respuesta
//       (campo `codigoDemo`) para poder completar el flujo en la UI.
//   Etapa 2 (CERTIFICACIÓN): documento + selfie → servicio verificador externo
//     (pendiente) + revisión humana del Owner (RF-18.4) → estado CERTIFICADO.
// =============================================================================
import { Router } from 'express';
import { randomInt } from 'node:crypto';
import { requiereSesion } from '../lib/auth.js';

const CODIGO_TTL_MS = 10 * 60 * 1000; // 10 minutos

/** Almacén en memoria de códigos: wallet -> {codigo, expira}. */
const codigos = new Map();

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

export function crearRouterKyc({ almacen }) {
  const r = Router();

  // POST /kyc/init — inicia la VERIFICACIÓN: genera código y lo envía al correo
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
      kyc: k,
      aviso: envio.enviado
        ? `Código enviado a ${u.correo} (vence en 10 min)`
        : `Código generado (${envio.motivo})`,
      // Solo en demo/sin SMTP: la UI puede mostrar el código para completar el flujo.
      ...(envio.enviado ? {} : { codigoDemo: codigo }),
    });
  });

  // POST /kyc/verify-codes — valida el código de correo → VERIFICADO (etapa 1)
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
    res.json({ usuario: u, kyc: k });
  });

  // POST /kyc/submit — envía documento + selfie (etapa 2 → requiere revisión humana)
  r.post('/submit', requiereSesion(almacen), async (req, res) => {
    const { documentoRef, selfieRef } = req.body;
    if (!documentoRef || !selfieRef) {
      return res.status(400).json({ error: 'documento_y_selfie_requeridos' });
    }
    const k = await almacen.actualizarKyc(req.wallet, {
      documentoRef, selfieRef,
      estado: 'PENDIENTE', // revisión humana del Owner (RF-18.4)
    });
    res.json({ kyc: k, aviso: 'KYC enviado — pendiente de revisión humana del Owner' });
  });

  // GET /kyc/status — estado de la verificación
  r.get('/status', requiereSesion(almacen), async (req, res) => {
    const u = await almacen.getUsuario(req.wallet);
    const k = await almacen.getKyc(req.wallet);
    res.json({ estado: u?.estado ?? null, kyc: k });
  });

  // POST /kyc/review — el Owner aprueba/rechaza (RF-18.4) → CERTIFICADO
  r.post('/review', requiereSesion(almacen), async (req, res) => {
    const { wallet, aprobar } = req.body;
    const w = (wallet || '').toLowerCase();
    const u = await almacen.getUsuario(w);
    if (!u) return res.status(404).json({ error: 'usuario_inexistente' });
    if (aprobar) {
      await almacen.actualizarUsuario(w, { estado: 'CERTIFICADO' });
      await almacen.actualizarKyc(w, { estado: 'APROBADO', revisadoPor: req.wallet });
      res.json({ usuario: await almacen.getUsuario(w) });
    } else {
      await almacen.actualizarKyc(w, { estado: 'RECHAZADO', revisadoPor: req.wallet });
      res.status(422).json({ error: 'kyc_rechazado' });
    }
  });

  return r;
}
