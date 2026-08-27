import { formatEstado, formatDateTime, formatDesde } from '../../utils/format.js'
import './TicketFlowStepper.css'

const TERMINALES = ['entregado', 'cancelado']

export default function TicketFlowStepper({ estados = [], historial = [], estadoActual = '', onChange, disabled = false }) {
  const porNombre = new Map(historial.map((h) => [h.posestado_nombre, h]))
  const flujo = estados.filter((e) => e.nombre !== 'cancelado')
  const idxActual = flujo.findIndex((e) => e.nombre === estadoActual)
  const estaCancelado = estadoActual === 'cancelado'
  const estadoCancelado = estados.find((e) => e.nombre === 'cancelado')
  const hCancelado = porNombre.get('cancelado')

  const bloqueado = disabled || TERMINALES.includes(estadoActual)
  const siguiente = !bloqueado && idxActual !== -1 ? flujo[idxActual + 1] : null

  const avanzar = () => {
    if (!siguiente) return
    if (
      siguiente.nombre === 'entregado' &&
      !window.confirm('¿Confirmás marcar el ticket como "Entregado"? Esta acción no se puede deshacer.')
    ) {
      return
    }
    onChange?.(siguiente.id)
  }

  const cancelar = () => {
    if (!estadoCancelado) return
    if (!window.confirm('¿Confirmás cancelar este ticket? Esta acción no se puede deshacer.')) return
    onChange?.(estadoCancelado.id)
  }

  return (
    <div className="tfs-wrap">
      <div className="tfs">
        <div className="tfs-line" />
        {flujo.map((estado, i) => {
          const h = porNombre.get(estado.nombre)
          const hecho = Boolean(h)
          const actual = i === idxActual
          return (
            <div key={estado.id} className={`tfs-item${hecho && !actual ? ' is-done' : ''}${actual ? ' is-current' : ''}`}>
              <span className="tfs-dot">{hecho && !actual ? '✓' : i + 1}</span>
              <div className="tfs-body">
                <span className="tfs-label">{formatEstado(estado.nombre)}</span>
                <span className="tfs-date">
                  {actual ? formatDesde(h?.fechacambio) : hecho ? formatDateTime(h.fechacambio) : 'Pendiente'}
                </span>
                {hecho && i > 0 && (
                  <span className={`tfs-notif${h.notificado ? ' is-ok' : ' is-off'}`}>
                    {h.notificado ? 'Cliente notificado' : 'No se notificó al cliente'}
                  </span>
                )}
              </div>
              {actual && <span className="tfs-badge">Actual</span>}
            </div>
          )
        })}
        {estaCancelado && estadoCancelado && (
          <div className="tfs-item is-cancel">
            <span className="tfs-dot">✕</span>
            <div className="tfs-body">
              <span className="tfs-label">Cancelado</span>
              <span className="tfs-date">{hCancelado ? formatDateTime(hCancelado.fechacambio) : ''}</span>
            </div>
          </div>
        )}
      </div>

      {siguiente && (
        <button type="button" className="adm-btn adm-btn--primary tfs-avanzar" onClick={avanzar} disabled={disabled}>
          Avanzar a &quot;{formatEstado(siguiente.nombre)}&quot;
        </button>
      )}
      {!bloqueado && (
        <button type="button" className="tfs-cancelar" onClick={cancelar} disabled={disabled}>
          Cancelar ticket
        </button>
      )}
      {bloqueado && !disabled && (
        <p className="tfs-terminal-msg">
          {estaCancelado ? 'Este ticket fue cancelado.' : 'Este ticket ya fue entregado.'}
        </p>
      )}
    </div>
  )
}
