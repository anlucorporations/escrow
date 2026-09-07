"use client";

// =============================================================================
// TrueKeate — Botón Conectar + Login único con la billetera
// Flujo (decisión del director): al pulsar se (1) conecta la wallet MetaMask,
// (2) consulta el estado de inscripción y (3) si está inscrito, pide la ÚNICA
// firma EIP-191 que emite el token de sesión global. Tras esto, todas las
// secciones quedan accesibles según el Tipo de Usuario (login con la billetera).
//
// Fix (reporte del director): al reconectar con OTRA wallet tras desconectar,
// el login único podía saltarse porque refrescar()/autenticar() dependían del
// estado de React, que aún no reflejaba la cuenta recién elegida (en MetaMask
// real el popup daba tiempo a vaciar el estado; en reconexión inmediata no).
// Ahora refrescar() recibe la wallet EXPLÍCITA recién conectada y autenticar()
// crea un provider/signer FRESCO en el momento de firmar (firma con la wallet
// activa en MetaMask), sin depender del estado de React.
// =============================================================================
import { useState } from "react";
import { useEthereum } from "@/lib/ethereum";
import { useSesion } from "@/lib/sesion";
import { Button } from "@/components/Button";

export function BotonConectarLogin({ className }: { className?: string }) {
  const { conectar, conectando } = useEthereum();
  const { autenticar, autenticando, refrescar } = useSesion();
  const [ocupado, setOcupado] = useState(false);

  const cargando = conectando || autenticando || ocupado;

  async function onClick() {
    setOcupado(true);
    try {
      const cuenta = await conectar();
      if (!cuenta) return;
      // refrescar(wallet) consulta con la wallet EXPLÍCITA recién conectada
      // (no depende del closure `acceso` ni de que React ya haya propagado la
      // cuenta). Devuelve el estado consultado para encadenar el login único.
      const estado = await refrescar(cuenta.toLowerCase());
      // Si la wallet ya está inscrita, se firma una vez (login único).
      if (estado.fase === "inscrito") await autenticar();
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Button onClick={() => void onClick()} disabled={cargando} className={className}>
      {cargando ? "Conectando…" : "🔗 Conectar MetaMask e iniciar sesión"}
    </Button>
  );
}
