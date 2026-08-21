import { formatEstado, formatDateTime } from '../../utils/format.js'
import './TicketTimeline.css'

export default function TicketTimeline({ historial = [], estadoActual = '', estados = [] }) {
  const porNombre = new Map(historial.map((h) => [h.posestado_nombre, h]))
  const idxActual = estados.findIndex((e) => e.nombre === estadoActual)

  return (
    <ol className="tl" role="list">
      {estados.map((estado, i) => {
        const h = porNombre.get(estado.nombre)
        const hecho = Boolean(h)
        const actual = i === idxActual
        const cancelado = estado.nombre === 'cancelado'
        const clase = [
          'tl-item',
          hecho && cancelado ? 'is-cancel' : '',
          hecho && !cancelado ? 'is-done' : '',
          actual ? 'is-current' : '',
        ].filter(Boolean).join(' ')

        return (
          <li key={estado.id} className={clase} aria-current={actual ? 'step' : undefined}>
            <span className="tl-dot" aria-hidden="true">
              {hecho ? (cancelado ? '✕' : '✓') : ''}
            </span>
            <div className="tl-body">
              <span className="tl-label">{formatEstado(estado.nombre)}</span>
              {estado.descripcion ? <span className="tl-desc">{estado.descripcion}</span> : null}
              <span className="tl-fecha">{h?.fechacambio ? formatDateTime(h.fechacambio) : 'Pendiente'}</span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
