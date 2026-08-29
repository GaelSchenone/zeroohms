import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/client.js'
import { formatEstado, estadoClass, diasDesde, tonoAntiguedad } from '../utils/format.js'
import { Plus } from 'pixelarticons/react'
import useStaggerReveal from '../hooks/useStaggerReveal.js'

const ESTADOS_TERMINALES = ['entregado', 'cancelado']

const STATUS_FILTERS = ['Todos', 'ticket_creado', 'equipo_recibido', 'diagnostico_realizado', 'esperando_aprobacion', 'en_reparacion', 'reparacion_finalizada', 'listo_para_retirar', 'entregado', 'cancelado']

export default function TicketsList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('Todos')
  const [query, setQuery] = useState(searchParams.get('search') || '')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const params = new URLSearchParams({ page, per_page: 20 })
    if (query) params.set('search', query)
    api(`/tickets?${params}`)
      .then(setTickets)
      .catch(() => setTickets([]))
      .finally(() => setLoading(false))
  }, [page, query])

  const filtered = filter === 'Todos'
    ? tickets
    : tickets.filter((t) => t.estado_actual === filter)

  const tbodyRef = useStaggerReveal(filtered)

  return (
    <div className="adm-panel">
      <div className="adm-panel-head">
        <h2>Tickets</h2>
        <Link to="/tickets/nuevo" className="adm-btn adm-btn--primary">
          <Plus size={16} /> Nuevo ticket
        </Link>
      </div>

      <input
        type="text"
        className="adm-search-input"
        placeholder="Buscar por ticket, cliente, DNI, N° de serie o problema…"
        value={query}
        onChange={(e) => {
          const val = e.target.value
          setQuery(val)
          setPage(1)
          setSearchParams(val ? { search: val } : {}, { replace: true })
        }}
      />

      <div className="adm-filters">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            className={`adm-filter${filter === s ? ' is-active' : ''}`}
            onClick={() => { setFilter(s); setPage(1) }}
          >
            {s === 'Todos' ? 'Todos' : formatEstado(s)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="adm-loading">Cargando tickets…</div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Equipo</th>
                <th>Problema</th>
                <th>Estado</th>
                <th>Antigüedad</th>
                <th></th>
              </tr>
            </thead>
            <tbody ref={tbodyRef}>
              {filtered.map((t) => {
                const equipo = [t.dispositivo_marca, t.dispositivo_modelo].filter(Boolean).join(' ')
                const cliente = [t.propietario_nombre, t.propietario_apellido].filter(Boolean).join(' ')
                const dias = diasDesde(t.fecha_ultimo_cambio)
                const tono = tonoAntiguedad(dias)
                return (
                  <tr key={t.tkid}>
                    <td className="adm-td-id">#{t.tkid}</td>
                    <td>
                      <div className="adm-device-cell">
                        <strong>{equipo || t.codigoseguimiento || '—'}</strong>
                        <span>
                          {cliente || 'Sin cliente asignado'}
                          {t.propietario_dni ? ` · DNI ${t.propietario_dni}` : ''}
                        </span>
                      </div>
                    </td>
                    <td>{t.descripcionproblema || '—'}</td>
                    <td>
                      <span className={`adm-status adm-status--${estadoClass(t.estado_actual)}`}>
                        {formatEstado(t.estado_actual)}
                      </span>
                    </td>
                    <td>
                      {ESTADOS_TERMINALES.includes(t.estado_actual) || dias == null ? (
                        <span className="adm-age adm-age--ok">—</span>
                      ) : (
                        <span className={`adm-age adm-age--${tono}`}>
                          <span className={`adm-age-dot adm-age-dot--${tono}`} />
                          {dias === 0 ? 'Hoy' : `${dias} día${dias === 1 ? '' : 's'}`}
                        </span>
                      )}
                    </td>
                    <td>
                      <Link to={`/tickets/${t.tkid}`} className="adm-btn adm-btn--ghost">
                        Ver
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="6" className="adm-empty">
                    {query || filter !== 'Todos'
                      ? 'No hay tickets que coincidan.'
                      : 'No hay tickets todavía.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
        <button className="adm-btn adm-btn--ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Anterior
        </button>
        <span style={{ alignSelf: 'center', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
          Página {page}
        </span>
        <button className="adm-btn adm-btn--ghost" disabled={tickets.length < 20} onClick={() => setPage((p) => p + 1)}>
          Siguiente
        </button>
      </div>
    </div>
  )
}
