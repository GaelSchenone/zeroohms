import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client.js'
import { formatEstado, estadoClass } from '../utils/format.js'

const ESTADOS = [
  { id: 1, nombre: 'pendiente' },
  { id: 2, nombre: 'en progreso' },
  { id: 3, nombre: 'completada' },
]

const PRIORIDADES = ['baja', 'media', 'alta']

export default function TicketKanban({ tkid }) {
  const [tareas, setTareas] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ descripcion: '', prioridad: 'media', usuario: '', fechalimite: '' })
  const [guardando, setGuardando] = useState(false)
  const [changingId, setChangingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const fetchTareas = useCallback(() => {
    setLoading(true)
    api(`/tareas?tkid=${tkid}&per_page=100`)
      .then(setTareas)
      .catch(() => setTareas([]))
      .finally(() => setLoading(false))
  }, [tkid])

  const fetchUsuarios = useCallback(() => {
    api('/usuarios?per_page=100')
      .then(setUsuarios)
      .catch(() => setUsuarios([]))
  }, [])

  useEffect(() => { fetchTareas() }, [fetchTareas])
  useEffect(() => { fetchUsuarios() }, [fetchUsuarios])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.descripcion.trim()) return
    setGuardando(true)
    try {
      await api('/tareas', {
        method: 'POST',
        body: {
          tkid: Number(tkid),
          descripcion: form.descripcion.trim(),
          prioridad: form.prioridad,
          usuario: form.usuario || null,
          fechalimite: form.fechalimite || null,
        },
      })
      setForm({ descripcion: '', prioridad: 'media', usuario: '', fechalimite: '' })
      setShowForm(false)
      fetchTareas()
    } finally {
      setGuardando(false)
    }
  }

  const handleMove = async (tareaid, posestadoId) => {
    setChangingId(tareaid)
    try {
      await api(`/tareas/${tareaid}/estado`, {
        method: 'POST',
        body: { posestado_id: posestadoId },
      })
      fetchTareas()
    } finally {
      setChangingId(null)
    }
  }

  const handleDelete = async (tareaid) => {
    if (!window.confirm('¿Eliminar esta tarea?')) return
    setDeletingId(tareaid)
    try {
      await api(`/tareas/${tareaid}`, { method: 'DELETE' })
      setTareas((prev) => prev.filter((t) => t.tareaid !== tareaid))
    } finally {
      setDeletingId(null)
    }
  }

  const grouped = ESTADOS.map((e) => ({
    ...e,
    items: tareas.filter((t) => t.estado_actual === e.nombre),
  }))

  const nextEstado = (actual) => {
    const idx = ESTADOS.findIndex((e) => e.nombre === actual)
    return idx < ESTADOS.length - 1 ? ESTADOS[idx + 1] : null
  }

  const prevEstado = (actual) => {
    const idx = ESTADOS.findIndex((e) => e.nombre === actual)
    return idx > 0 ? ESTADOS[idx - 1] : null
  }

  const priorityColor = (p) => {
    if (p === 'alta') return { bg: 'rgba(239,68,68,0.15)', text: '#fca5a5', border: 'rgba(239,68,68,0.3)' }
    if (p === 'media') return { bg: 'rgba(234,179,8,0.15)', text: '#fde68a', border: 'rgba(234,179,8,0.3)' }
    return { bg: 'rgba(34,197,94,0.15)', text: '#86efac', border: 'rgba(34,197,94,0.3)' }
  }

  const formatDeadline = (dateStr) => {
    if (!dateStr) return null
    const d = new Date(dateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    d.setHours(0, 0, 0, 0)
    const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24))
    if (diff < 0) return { text: `Vencida (${d.toLocaleDateString('es-AR')})`, overdue: true }
    if (diff === 0) return { text: `Hoy (${d.toLocaleDateString('es-AR')})`, overdue: false, today: true }
    if (diff === 1) return { text: `Mañana (${d.toLocaleDateString('es-AR')})`, overdue: false }
    return { text: d.toLocaleDateString('es-AR'), overdue: false }
  }

  if (loading) return <div className="adm-loading">Cargando tareas…</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>
          {tareas.length} tarea{tareas.length !== 1 ? 's' : ''}
        </span>
        <button className="adm-btn adm-btn--primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Nueva tarea'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={{
          padding: '1rem', background: 'rgba(255,255,255,0.04)', borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '0.75rem',
        }}>
          <div className="adm-field">
            <label>Descripción</label>
            <input
              type="text"
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              placeholder="Ej: Reemplazar placa madre"
              autoFocus
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <div className="adm-field">
              <label>Prioridad</label>
              <select value={form.prioridad} onChange={(e) => setForm({ ...form, prioridad: e.target.value })}>
                {PRIORIDADES.map((p) => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="adm-field">
              <label>Asignar a</label>
              <select value={form.usuario} onChange={(e) => setForm({ ...form, usuario: e.target.value })}>
                <option value="">— Sin asignar —</option>
                {usuarios.map((u) => (
                  <option key={u.usuario} value={u.usuario}>{u.usuario}</option>
                ))}
              </select>
            </div>
            <div className="adm-field">
              <label>Fecha límite</label>
              <input
                type="date"
                value={form.fechalimite}
                onChange={(e) => setForm({ ...form, fechalimite: e.target.value })}
              />
            </div>
          </div>
          <button className="adm-btn adm-btn--primary" type="submit" disabled={guardando || !form.descripcion.trim()}>
            {guardando ? 'Creando…' : 'Crear tarea'}
          </button>
        </form>
      )}

      <div className="adm-kanban">
        {grouped.map((col) => (
          <div key={col.id} className="adm-kanban-col">
            <div className="adm-kanban-header">
              <span className={`adm-status adm-status--${estadoClass(col.nombre)}`}>
                {formatEstado(col.nombre)}
              </span>
              <span className="adm-kanban-count">{col.items.length}</span>
            </div>
            <div className="adm-kanban-cards">
              {col.items.length === 0 && (
                <div className="adm-kanban-empty">Sin tareas</div>
              )}
              {col.items.map((t) => {
                const pc = priorityColor(t.prioridad)
                const nxt = nextEstado(t.estado_actual)
                const prv = prevEstado(t.estado_actual)
                const deadline = formatDeadline(t.fechalimite)
                return (
                  <div key={t.tareaid} className="adm-kanban-card">
                    <div className="adm-kanban-card-head">
                      <span
                        className="adm-kanban-priority"
                        style={{ background: pc.bg, color: pc.text, borderColor: pc.border }}
                      >
                        {t.prioridad || '—'}
                      </span>
                      <span className="adm-kanban-id">#{t.tareaid}</span>
                    </div>
                    <p className="adm-kanban-desc">{t.descripcion || 'Sin descripción'}</p>
                    {t.usuario && (
                      <span className="adm-kanban-user">{t.usuario}</span>
                    )}
                    {deadline && (
                      <span className="adm-kanban-deadline" style={{ ...(deadline.overdue ? { background: 'rgba(239,68,68,0.15)', color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' } : deadline.today ? { background: 'rgba(234,179,8,0.15)', color: '#fde68a', borderColor: 'rgba(234,179,8,0.3)' } : { background: 'rgba(34,197,94,0.15)', color: '#86efac', borderColor: 'rgba(34,197,94,0.3)' }), fontSize: '0.65rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: '10px', border: '1px solid', display: 'inline-block', marginTop: '0.25rem' }}>
                        📅 {deadline.text}
                      </span>
                    )}
                    <div className="adm-kanban-actions">
                      {prv && (
                        <button
                          className="adm-btn adm-btn--ghost"
                          style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                          disabled={changingId === t.tareaid}
                          onClick={() => handleMove(t.tareaid, prv.id)}
                          title={`Mover a ${prv.nombre}`}
                        >
                          ← {formatEstado(prv.nombre)}
                        </button>
                      )}
                      {nxt && (
                        <button
                          className="adm-btn adm-btn--ghost"
                          style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                          disabled={changingId === t.tareaid}
                          onClick={() => handleMove(t.tareaid, nxt.id)}
                          title={`Mover a ${nxt.nombre}`}
                        >
                          {formatEstado(nxt.nombre)} →
                        </button>
                      )}
                      <button
                        className="adm-btn adm-btn--ghost"
                        style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', color: '#f87171', borderColor: 'rgba(239,68,68,0.4)', marginLeft: 'auto' }}
                        disabled={deletingId === t.tareaid}
                        onClick={() => handleDelete(t.tareaid)}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}