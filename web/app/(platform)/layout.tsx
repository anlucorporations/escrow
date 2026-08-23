'use client'

import { AccessGate } from '@/components/AccessGate'

/**
 * Layout del grupo de rutas protegidas de la plataforma.
 * Todo lo que viva dentro de app/(platform)/ solo es accesible con la
 * billetera conectada E inscrita on-chain (verificado en AccessGate).
 */
export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return <AccessGate>{children}</AccessGate>
}
