import { useState, useEffect } from 'react'
import { api } from '../api/client.js'
import { formatEstado, estadoClass, formatMoney } from '../utils/format.js'
import Combobox from '../components/tickets/Combobox.jsx'
import useStaggerReveal from '../hooks/useStaggerReveal.js'

export default function PresupuestosList() {
  const [presupuestos, setPresupuestos] = useState([])
  const [estados, setEstados] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterTkId, setFilterTkId] = useState('')
  const [changing, setChanging] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const tbodyRef = useStaggerReveal(presupuestos)

  const fetchPresupuestos = () => {
    setLoading(true)
    const params = new URLSearchParams({ per_page: 50 })
    if (filterTkId) params.set('tkid', filterTkId)
    api(`/presupuestos?${params}`)
      .then(setPresupuestos)
      .catch(() => setPresupuestos([]))
      .finally(() => setLoading(false))
  }

  useEffect(fetchPresupuestos, [filterTkId])

  useEffect(() => {
    api('/presupuestos/estados').then(setEstados).catch(() => setEstados([]))
  }, [])

  const handleStateChange = async (presupuestoid, posestadoId) => {
    setChanging(presupuestoid)
    try {
      await api(`/presupuestos/${presupuestoid}/estado`, {
        method: 'POST',
        body: { posestado_id: posestadoId },
      })
      fetchPresupuestos()
    } finally {
      setChanging(null)
    }
  }

  const handleDelete = async (presupuestoid) => {
    if (!window.confirm('¿Eliminar este presupuesto?')) return
    setDeleting(presupuestoid)
    try {
      await api(`/presupuestos/${presupuestoid}`, { method: 'DELETE' })
      setPresupuestos((prev) => prev.filter((p) => p.presupuestoid !== presupuestoid))
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="adm-panel">
      <div className="adm-panel-head">
        <h2>Presupuestos</h2>
        <input
          type="text"
          placeholder="Filtrar por ticket ID"
          value={filterTkId}
          onChange={(e) => setFilterTkId(e.target.value)}
          style={{
            width: '150px', padding: '0.5rem 0.75rem', fontSize: '0.85rem',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '6px', color: '#fff', outline: 'none',
          }}
        />
      </div>

      {loading ? (
        <div className="adm-loading">Cargando presupuestos…</div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Ticket</th>
                <th>Monto</th>
                <th>Fecha creación</th>
                <th>Validez</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody ref={tbodyRef}>
              {presupuestos.map((p) => (
                <tr key={p.presupuestoid}>
                  <td className="adm-td-id">#{p.presupuestoid}</td>
                  <td>#{p.tkid}</td>
                  <td style={{ fontWeight: 600 }}>{formatMoney(p.monto)}</td>
                  <td>{p.fechacreacion ? new Date(p.fechacreacion).toLocaleDateString('es-AR') : '—'}</td>
                  <td>{p.fechavalidez ? new Date(p.fechavalidez).toLocaleDateString('es-AR') : '—'}</td>
                  <td>
                    <span className={`adm-status adm-status--${estadoClass(p.estado_actual)}`}>
                      {formatEstado(p.estado_actual)}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <Combobox
                        placeholder="Marcar como…"
                        value={null}
                        disabled={changing === p.presupuestoid}
                        onChange={(id) => handleStateChange(p.presupuestoid, Number(id))}
                        options={estados
                          .filter((e) => e.nombre !== p.estado_actual)
                          .map((e) => ({ value: e.id, label: formatEstado(e.nombre) }))}
                      />
                      <button
                        className="adm-btn adm-btn--ghost"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', color: '#f87171', borderColor: 'rgba(239,68,68,0.4)' }}
                        disabled={deleting === p.presupuestoid}
                        onClick={() => handleDelete(p.presupuestoid)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {presupuestos.length === 0 && (
                <tr>
                  <td colSpan="7" className="adm-empty">No hay presupuestos.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
