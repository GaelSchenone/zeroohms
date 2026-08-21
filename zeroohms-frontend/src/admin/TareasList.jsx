import { useState, useEffect } from 'react'
import { api } from '../api/client.js'
import { formatEstado, estadoClass } from '../utils/format.js'

const ESTADOS = [
  { id: 1, nombre: 'pendiente' },
  { id: 2, nombre: 'en progreso' },
  { id: 3, nombre: 'completada' },
]

export default function TareasList() {
  const [tareas, setTareas] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterTkId, setFilterTkId] = useState('')
  const [changing, setChanging] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const fetchTareas = () => {
    setLoading(true)
    const params = new URLSearchParams({ per_page: 50 })
    if (filterTkId) params.set('tkid', filterTkId)
    api(`/tareas?${params}`)
      .then(setTareas)
      .catch(() => setTareas([]))
      .finally(() => setLoading(false))
  }

  useEffect(fetchTareas, [filterTkId])

  const handleStateChange = async (tareaid, posestadoId) => {
    setChanging(tareaid)
    try {
      await api(`/tareas/${tareaid}/estado`, {
        method: 'POST',
        body: { posestado_id: posestadoId },
      })
      fetchTareas()
    } finally {
      setChanging(null)
    }
  }

  const handleDelete = async (tareaid) => {
    if (!window.confirm('¿Eliminar esta tarea?')) return
    setDeleting(tareaid)
    try {
      await api(`/tareas/${tareaid}`, { method: 'DELETE' })
      setTareas((prev) => prev.filter((t) => t.tareaid !== tareaid))
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="adm-panel">
      <div className="adm-panel-head">
        <h2>Tareas</h2>
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
        <div className="adm-loading">Cargando tareas…</div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Ticket</th>
                <th>Descripción</th>
                <th>Prioridad</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tareas.map((t) => (
                <tr key={t.tareaid}>
                  <td className="adm-td-id">#{t.tareaid}</td>
                  <td>#{t.tkid}</td>
                  <td>{t.descripcion || '—'}</td>
                  <td>{t.prioridad || '—'}</td>
                  <td>
                    <span className={`adm-status adm-status--${estadoClass(t.estado_actual)}`}>
                      {formatEstado(t.estado_actual)}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                      {ESTADOS.filter((e) => e.nombre !== t.estado_actual).map((e) => (
                        <button
                          key={e.id}
                          className="adm-btn adm-btn--ghost"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                          disabled={changing === t.tareaid}
                          onClick={() => handleStateChange(t.tareaid, e.id)}
                        >
                          {formatEstado(e.nombre)}
                        </button>
                      ))}
                      <button
                        className="adm-btn adm-btn--ghost"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', color: '#f87171', borderColor: 'rgba(239,68,68,0.4)' }}
                        disabled={deleting === t.tareaid}
                        onClick={() => handleDelete(t.tareaid)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {tareas.length === 0 && (
                <tr>
                  <td colSpan="6" className="adm-empty">No hay tareas.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
