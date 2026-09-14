/**
 * Inicio de la wallet (rediseño): saldo y menú de secciones. Cada sección abre
 * una página propia que ocupa todo el espacio de la billetera.
 */
export interface SeccionInicio {
  id: string
  icono: string
  titulo: string
  detalle?: string
}

export function Inicio({
  saldo,
  cuenta,
  secciones,
  onIr,
}: {
  saldo: string
  cuenta: string
  secciones: SeccionInicio[]
  onIr: (id: string) => void
}) {
  return (
    <div className="tk-inicio">
      <div className="tk-inicio__saldo">
        <span className="tk-inicio__monto">{saldo} ETH</span>
        <span className="tk-inicio__cuenta tk-mono">{cuenta}</span>
      </div>

      <nav className="tk-inicio__secciones" aria-label="Secciones de la wallet">
        {secciones.map((s) => (
          <button key={s.id} type="button" className="tk-inicio__seccion" onClick={() => onIr(s.id)}>
            <span className="tk-inicio__icono" aria-hidden>
              {s.icono}
            </span>
            <span className="tk-inicio__texto">
              <span className="tk-inicio__titulo">{s.titulo}</span>
              {s.detalle && <span className="tk-inicio__detalle">{s.detalle}</span>}
            </span>
            <span className="tk-inicio__chevron" aria-hidden>
              ›
            </span>
          </button>
        ))}
      </nav>
    </div>
  )
}
