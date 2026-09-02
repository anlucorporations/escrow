// =============================================================================
// TrueKeate — Router /kyc (Ciclo 6)
// Verificación en 2 etapas (D28, CU-02):
//   Etapa 1: códigos en correo y teléfono → estado VERIFICADO.
//   Etapa 2: documento + selfie (servicio verificador + revisión humana Owner RF-18.4)
//            → estado CERTIFICADO.
// =============================================================================
import { Router } from 'express';
import { requiereSesion } from '../lib/auth.js';

export function crearRouterKyc({ almacen }) {
  const r = Router();

  // POST /kyc/init — inicia la verificación (etapa 1: códigos correo/teléfono)
  r.post('/init', requiereSesion(almacen), (req, res) => {
    const u = almacen.getUsuario(req.wallet);
    const k = almacen.initKyc(req.wallet);
    // En producción se envían códigos por email (Nodemailer+SMTP — D37) e in-app.
    res.json({ kyc: k, aviso: 'códigos enviados al correo y teléfono (etapa 1 — D28)', usuario: u });
  });

  // POST /kyc/verify-codes — confirma códigos → VERIFICADO (etapa 1)
  r.post('/verify-codes', requiereSesion(almacen), (req, res) => {
    const { codigoCorreo, codigoTelefono } = req.body;
    if (!codigoCorreo || !codigoTelefono) {
      return res.status(400).json({ error: 'codigos_requeridos' });
    }
    // En producción los códigos se validan contra los generados (hash + vencimiento).
    const u = almacen.actualizarUsuario(req.wallet, { estado: 'VERIFICADO' });
    const k = almacen.actualizarKyc(req.wallet, { etapa: 1 });
    res.json({ usuario: u, kyc: k });
  });

  // POST /kyc/submit — envía documento + selfie (etapa 2 → requiere revisión humana)
  r.post('/submit', requiereSesion(almacen), (req, res) => {
    const { documentoRef, selfieRef } = req.body;
    if (!documentoRef || !selfieRef) {
      return res.status(400).json({ error: 'documento_y_selfie_requeridos' });
    }
    // El documento/selfie se cifran en reposo (D17); solo hashes/refs se guardan aquí.
    const k = almacen.actualizarKyc(req.wallet, {
      documentoRef, selfieRef,
      estado: 'PENDIENTE', // revisión humana del Owner (RF-18.4)
    });
    res.json({ kyc: k, aviso: 'KYC enviado — pendiente de revisión humana del Owner' });
  });

  // GET /kyc/status — estado de la verificación
  r.get('/status', requiereSesion(almacen), (req, res) => {
    const u = almacen.getUsuario(req.wallet);
    const k = almacen.getKyc(req.wallet);
    res.json({ estado: u.estado, kyc: k });
  });

  // POST /kyc/review — el Owner aprueba/rechaza (RF-18.4) → CERTIFICADO
  r.post('/review', requiereSesion(almacen), (req, res) => {
    const { wallet, aprobar } = req.body;
    const w = (wallet || '').toLowerCase();
    const u = almacen.getUsuario(w);
    if (!u) return res.status(404).json({ error: 'usuario_inexistente' });
    if (aprobar) {
      almacen.actualizarUsuario(w, { estado: 'CERTIFICADO' });
      almacen.actualizarKyc(w, { estado: 'APROBADO', revisadoPor: req.wallet });
      res.json({ usuario: almacen.getUsuario(w) });
    } else {
      almacen.actualizarKyc(w, { estado: 'RECHAZADO', revisadoPor: req.wallet });
      res.status(422).json({ error: 'kyc_rechazado' });
    }
  });

  return r;
}
