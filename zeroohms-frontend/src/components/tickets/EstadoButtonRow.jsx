import { formatEstado } from '../../utils/format.js'
import './EstadoButtonRow.css'

const TERMINALES = ['entregado', 'cancelado']

export default function EstadoButtonRow({ estados = [], estadoActual = '', onChange, disabled = false }) {
  const bloqueado = disabled || TERMINALES.includes(estadoActual)
  const idxActual = estados.findIndex((e) => e.nombre === estadoActual)

  const manejarClick = (estado) => {
    if (
      (estado.nombre === 'cancelado' || estado.nombre === 'entregado') &&
      !window.confirm(`¿Confirmás marcar el ticket como "${formatEstado(estado.nombre)}"? Esta acción no se puede deshacer.`)
    ) {
      return
    }
    onChange?.(estado.id)
  }

  return (
    <div className="ebr" role="group" aria-label="Cambiar estado del ticket">
      {estados.map((estado, i) => {
        const activo = estado.nombre === estadoActual
        const completado = idxActual !== -1 && i < idxActual
        const clase = [
          'ebr-btn',
          activo ? 'is-active' : '',
          completado ? 'is-done' : '',
          estado.nombre === 'cancelado' ? 'is-cancel' : '',
        ].filter(Boolean).join(' ')
        return (
          <button
            key={estado.id}
            type="button"
            className={clase}
            disabled={bloqueado}
            aria-pressed={activo}
            onClick={() => manejarClick(estado)}
          >
            {formatEstado(estado.nombre)}
          </button>
        )
      })}
    </div>
  )
}
