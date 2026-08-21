import { useState, useEffect } from 'react'
import { api } from '../../api/client.js'
import { Plus } from 'pixelarticons/react'
import './TareaKanban.css'

const COLUMNAS = [
  { id: 1, titulo: 'Pendiente', nombre: 'pendiente' },
  { id: 2, titulo: 'En progreso', nombre: 'en progreso' },
  { id: 3, titulo: 'Completada', nombre: 'completada' },
]
const PRIORIDADES = ['baja', 'media', 'alta']
const FORM_VACIO = { descripcion: '', prioridad: 'media', usuario: '', fechalimite: '' }

export default function TareaKanban({
  tkid = null,
  title = 'Tablero de tareas',
  actions = null,
  showCreate = true,
  showDelete = true,
}) {
  const [tareas, setTareas] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(FORM_VACIO)
  const [guardando, setGuardando] = useState(false)
  const [dragId, setDragId] = useState(null)
  const [overCol, setOverCol] = useState(null)

  const puedeCrear = showCreate && Boolean(tkid)

  const fetchTareas = () => {
    setLoading(true)
    const params = new URLSearchParams({ per_page: 50 })
    if (tkid) params.set('tkid', String(tkid))
    api(`/tareas?${params}`)
      .then(setTareas)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(fetchTareas, [tkid])

  useEffect(() => {
    if (!showForm) return
    let activo = true
    api('/usuarios?per_page=100')
      .then((us) => {
        if (activo) setUsuarios(us)
      })
      .catch(() => setUsuarios([]))
    return () => {
      activo = false
    }
  }, [showForm])

  const moverTarea = async (tareaid, posestadoId) => {
    const tarea = tareas.find((t) => t.tareaid === tareaid)
    if (!tarea || tarea.posestado_id === posestadoId) return
    const anterior = tareas
    const columna = COLUMNAS.find((c) => c.id === posestadoId)
    setError(null)
    // Actualización optimista: la tarjeta se mueve al instante
    setTareas((ts) =>
      ts.map((t) =>
        t.tareaid === tareaid
          ? { ...t, posestado_id: posestadoId, estado_actual: columna.nombre }
          : t,
      ),
    )
    try {
      await api(`/tareas/${tareaid}/estado`, {
        method: 'POST',
        body: { posestado_id: posestadoId },
      })
    } catch (err) {
      setTareas(anterior)
      setError(err.message)
    }
  }

  const eliminarTarea = async (tareaid) => {
    if (!window.confirm('¿Eliminar esta tarea?')) return
    try {
      await api(`/tareas/${tareaid}`, { method: 'DELETE' })
      setTareas((prev) => prev.filter((t) => t.tareaid !== tareaid))
    } catch (err) {
      setError(err.message)
    }
  }

  const guardarTarea = async (e) => {
    e.preventDefault()
    setGuardando(true)
    setError(null)
    try {
      await api('/tareas', {
        method: 'POST',
        body: {
          tkid,
          descripcion: form.descripcion.trim(),
          prioridad: form.prioridad,
          usuario: form.usuario || null,
          fechalimite: form.fechalimite || null,
        },
      })
      setShowForm(false)
      setForm(FORM_VACIO)
      fetchTareas()
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  const setCampo = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }))

  const handleDragStart = (e, tareaid) => {
    e.dataTransfer.setData('text/plain', String(tareaid))
    e.dataTransfer.effectAllowed = 'move'
    setDragId(tareaid)
  }

  const handleDragEnd = () => {
    setDragId(null)
    setOverCol(null)
  }

  const handleDragOver = (e, colId) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (overCol !== colId) setOverCol(colId)
  }

  const handleDrop = (e, colId) => {
    e.preventDefault()
    const tareaid = Number(e.dataTransfer.getData('text/plain'))
    if (tareaid) moverTarea(tareaid, colId)
    setDragId(null)
    setOverCol(null)
  }

  return (
    <div className="adm-panel">
      <div className="adm-panel-head">
        <h2>{title}</h2>
        <div className="adm-filters">
          {actions}
          {puedeCrear && (
            <button type="button" className="adm-btn" onClick={() => setShowForm(true)}>
              <Plus aria-hidden="true" /> Nueva tarea
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="adm-error" role="alert">
          {error}
        </div>
      )}

      {showForm && puedeCrear && (
        <form className="tk-form" onSubmit={guardarTarea}>
          <input
            required
            placeholder="Descripción de la tarea"
            value={form.descripcion}
            onChange={setCampo('descripcion')}
          />
          <select value={form.prioridad} onChange={setCampo('prioridad')}>
            {PRIORIDADES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select value={form.usuario} onChange={setCampo('usuario')}>
            <option value="">Sin asignar</option>
            {usuarios.map((u) => (
              <option key={u.usuario} value={u.usuario}>{u.usuario}</option>
            ))}
          </select>
          <input type="date" value={form.fechalimite} onChange={setCampo('fechalimite')} />
          <button type="submit" className="adm-btn" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
          <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setShowForm(false)}>
            Cancelar
          </button>
        </form>
      )}

      {loading ? (
        <div className="adm-loading">Cargando tareas…</div>
      ) : (
        <div className="adm-kanban">
          {COLUMNAS.map((col) => {
            const deColumna = tareas.filter((t) => t.posestado_id === col.id)
            return (
              <section
                key={col.id}
                className={`tk-col${overCol === col.id ? ' tk-col--over' : ''}`}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDrop={(e) => handleDrop(e, col.id)}
                onDragLeave={() => overCol === col.id && setOverCol(null)}
              >
                <header className="adm-kanban-header">
                  <span>{col.titulo}</span>
                  <span className="adm-kanban-count">{deColumna.length}</span>
                </header>
                <div className="adm-kanban-cards">
                  {deColumna.length === 0 && <div className="adm-kanban-empty">Sin tareas</div>}
                  {deColumna.map((t) => (
                    <article
                      key={t.tareaid}
                      className={`adm-kanban-card tk-card${dragId === t.tareaid ? ' tk-card--dragging' : ''}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, t.tareaid)}
                      onDragEnd={handleDragEnd}
                    >
                      <div className="adm-kanban-card-head">
                        <span className="adm-kanban-id">#{t.tareaid}</span>
                        <span className={`adm-kanban-priority tk-prioridad--${t.prioridad}`}>
                          {t.prioridad}
                        </span>
                      </div>
                      <p className="adm-kanban-desc">{t.descripcion}</p>
                      {(t.usuario || t.fechalimite) && (
                        <div className="tk-meta">
                          {t.usuario && <span className="adm-kanban-user">{t.usuario}</span>}
                          {t.fechalimite && (
                            <span className="tk-limite">
                              {new Date(t.fechalimite).toLocaleDateString('es-AR')}
                            </span>
                          )}
                        </div>
                      )}
                      {showDelete && (
                        <div className="adm-kanban-actions">
                          <button
                            type="button"
                            className="adm-btn adm-btn--ghost"
                            onClick={() => eliminarTarea(t.tareaid)}
                          >
                            Eliminar
                          </button>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
