"use client";

// =============================================================================
// TrueKeate — Botón Conectar + Login único con la billetera
// Flujo (decisión del director): al pulsar se (1) conecta la wallet MetaMask,
// (2) consulta el estado de inscripción y (3) si está inscrito, pide la ÚNICA
// firma EIP-191 que emite el token de sesión global. Tras esto, todas las
// secciones quedan accesibles según el Tipo de Usuario (login con la billetera).
// =============================================================================
import { useState } from "react";
import { useEthereum } from "@/lib/ethereum";
import { useSesion } from "@/lib/sesion";
import { Button } from "@/components/Button";

export function BotonConectarLogin({ className }: { className?: string }) {
  const { conectar, conectando } = useEthereum();
  const { acceso, autenticar, autenticando, refrescar } = useSesion();
  const [ocupado, setOcupado] = useState(false);

  const cargando = conectando || autenticando || ocupado;

  async function onClick() {
    setOcupado(true);
    try {
      const cuenta = await conectar();
      if (!cuenta) return;
      await refrescar();
      // Si la wallet ya está inscrita, se firma una vez (login único).
      if (acceso.fase === "inscrito") await autenticar();
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
