import { useCallback, useEffect, useState } from 'react'
import { formatEstado, estadoClass } from '../utils/format.js'
import TicketTimeline from '../components/tickets/TicketTimeline.jsx'
import './TrackingPage.css'

const API_BASE = '/api'

export default function TrackingPage() {
  const [codigo, setCodigo] = useState(() => new URLSearchParams(window.location.search).get('c') || '')
  const [estados, setEstados] = useState([])
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`${API_BASE}/tickets/estados`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setEstados)
      .catch(() => setEstados([]))
  }, [])

  const buscar = useCallback(async (cod) => {
    const limpio = String(cod || '').trim()
    if (!limpio) return
    setLoading(true)
    setError('')
    setTicket(null)
    try {
      const res = await fetch(`${API_BASE}/tracking/${encodeURIComponent(limpio)}`)
      const data = await res.json()
      if (!res.ok) {
        setError(typeof data.detail === 'string' ? data.detail : 'Ticket no encontrado')
      } else {
        setTicket(data)
      }
    } catch {
      setError('Error al buscar el ticket')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get('c')
    if (c) buscar(c)
  }, [buscar])

  return (
    <div className="track-page">
      <div className="track-card">
        <img className="track-logo" src="/logos/imagotipo.svg" alt="Zero Ohms" />
        <h1 className="track-title">Seguí tu reparación</h1>
        <p className="track-subtitle">Ingresá el código de seguimiento que recibiste para ver el estado de tu equipo.</p>

        <form className="track-form" onSubmit={(e) => { e.preventDefault(); buscar(codigo) }}>
          <input
            type="text"
            className="track-input"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="Ej: ZO-4998"
            aria-label="Código de seguimiento"
          />
          <button className="track-btn" type="submit" disabled={loading}>
            {loading ? 'Buscando…' : 'Buscar'}
          </button>
        </form>

        {error && <p className="track-error">{error}</p>}

        {ticket && (
          <div className="track-result">
            <div className="track-result-header">
              <span className="track-result-id">Ticket #{ticket.tkid}</span>
              <span className={`track-status track-status--${estadoClass(ticket.estado_actual)}`}>
                {formatEstado(ticket.estado_actual)}
              </span>
            </div>

            <div className="track-result-info">
              <div>
                <span className="track-label">Dispositivo</span>
                <span className="track-value">
                  {ticket.dispositivo_marca || ''} {ticket.dispositivo_modelo || '—'}
                </span>
              </div>
              <div>
                <span className="track-label">Fecha de ingreso</span>
                <span className="track-value">
                  {ticket.fechacreacion ? new Date(ticket.fechacreacion).toLocaleDateString('es-AR') : '—'}
                </span>
              </div>
            </div>

            {ticket.descripcionproblema && (
              <div className="track-problema">
                <span className="track-label">Problema reportado</span>
                <span className="track-value">{ticket.descripcionproblema}</span>
              </div>
            )}

            <div className="track-timeline">
              <h3>Estado de tu reparación</h3>
              <TicketTimeline
                historial={ticket.historial_estados || []}
                estadoActual={ticket.estado_actual}
                estados={estados}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
