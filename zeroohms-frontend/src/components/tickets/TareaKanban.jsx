import { useState, useEffect, useRef } from 'react'
import { api } from '../../api/client.js'
import { Plus, Search, Reload, SettingsCog2, ChevronDown } from 'pixelarticons/react'
import { iniciales } from '../../utils/format.js'
import './TareaKanban.css'

// Las columnas visibles del tablero. Los id/nombre reales de cada estado
// se traen del backend (GET /tareas/estados) porque el catálogo PosEstadosTareas
// también incluye "pausada" y "cancelada", que este tablero no muestra.
const NOMBRES_VISIBLES = ['pendiente', 'en_progreso', 'completada']
const TITULOS = { pendiente: 'Pendiente', en_progreso: 'En progreso', completada: 'Completada' }
const TONOS = { pendiente: 'blue', en_progreso: 'amber', completada: 'green' }

const PRESETS = [
  {
    id: 'diagnostico',
    label: 'Diagnóstico',
    icon: Search,
    tareas: [
      'Diagnóstico inicial del problema',
      'Confirmar el problema reportado con el cliente',
      'Presupuestar la reparación',
    ],
  },
  {
    id: 'actualizacion',
    label: 'Actualización',
    icon: Reload,
    tareas: [
      'Backup de datos del cliente',
      'Actualizar sistema operativo y drivers',
      'Verificar funcionamiento post-actualización',
    ],
  },
  {
    id: 'reparacion',
    label: 'Reparación',
    icon: SettingsCog2,
    tareas: [
      'Desarmar el equipo',
      'Reemplazar la pieza defectuosa',
      'Probar funcionamiento',
      'Armar el equipo',
    ],
  },
]

function estaVencida(tarea) {
  if (!tarea.fechalimite || tarea.estado_actual === 'completada') return false
  return new Date(tarea.fechalimite) < new Date(new Date().toDateString())
}

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
  const [columnas, setColumnas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(FORM_VACIO)
  const [guardando, setGuardando] = useState(false)
  const [showPresetMenu, setShowPresetMenu] = useState(false)
  const [cargandoPreset, setCargandoPreset] = useState(false)

  const [draggingIds, setDraggingIds] = useState([])
  const [overCol, setOverCol] = useState(null)

  const [selected, setSelected] = useState(new Set())
  const [lastClicked, setLastClicked] = useState(null)
  const [aplicandoBulk, setAplicandoBulk] = useState(false)

  const [menuAbierto, setMenuAbierto] = useState(null)
  const [editando, setEditando] = useState(null)

  const puedeCrear = showCreate && Boolean(tkid)
  const presetRef = useRef(null)

  useEffect(() => {
    if (!showPresetMenu) return
    const onClickOutside = (e) => {
      if (presetRef.current && !presetRef.current.contains(e.target)) setShowPresetMenu(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [showPresetMenu])

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
    let activo = true
    api('/tareas/estados')
      .then((data) => {
        if (!activo) return
        const cols = NOMBRES_VISIBLES
          .map((nombre) => data.find((e) => e.nombre === nombre))
          .filter(Boolean)
          .map((e) => ({ id: e.id, nombre: e.nombre, titulo: TITULOS[e.nombre] || e.nombre, tono: TONOS[e.nombre] || 'blue' }))
        setColumnas(cols)
      })
      .catch(() => setColumnas([]))
    return () => {
      activo = false
    }
  }, [])

  useEffect(() => {
    let activo = true
    api('/usuarios?per_page=100')
      .then((us) => {
        if (activo) setUsuarios(us)
      })
      .catch(() => setUsuarios([]))
    return () => {
      activo = false
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelected(new Set())
        setLastClicked(null)
        setMenuAbierto(null)
        setEditando(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (menuAbierto == null) return
    const onClickOutside = (e) => {
      if (!e.target.closest('.tk-kebab-wrap')) setMenuAbierto(null)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [menuAbierto])

  const flatOrder = columnas.flatMap((col) => tareas.filter((t) => t.estado_actual === col.nombre))

  const moverVarias = async (ids, posestadoId) => {
    const columna = columnas.find((c) => c.id === posestadoId)
    if (!columna) return
    const anterior = tareas
    const idsSet = new Set(ids)
    setError(null)
    setTareas((ts) => ts.map((t) => (idsSet.has(t.tareaid) ? { ...t, estado_actual: columna.nombre } : t)))
    try {
      await Promise.all(
        ids.map((tareaid) => api(`/tareas/${tareaid}/estado`, { method: 'POST', body: { posestado_id: posestadoId } })),
      )
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
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(tareaid)
        return next
      })
    } catch (err) {
      setError(err.message)
    }
  }

  const guardarCampo = async (tareaid, campo, valor) => {
    const anterior = tareas
    setTareas((ts) => ts.map((t) => (t.tareaid === tareaid ? { ...t, [campo]: valor } : t)))
    setEditando(null)
    try {
      await api(`/tareas/${tareaid}`, { method: 'PUT', body: { [campo]: valor } })
    } catch (err) {
      setTareas(anterior)
      setError(err.message)
    }
  }

  const eliminarVarias = async () => {
    if (selected.size === 0) return
    if (!window.confirm(`¿Eliminar ${selected.size} tarea${selected.size === 1 ? '' : 's'}? Esta acción no se puede deshacer.`)) return
    const ids = [...selected]
    setAplicandoBulk(true)
    setError(null)
    try {
      await Promise.all(ids.map((tareaid) => api(`/tareas/${tareaid}`, { method: 'DELETE' })))
      setTareas((prev) => prev.filter((t) => !ids.includes(t.tareaid)))
      setSelected(new Set())
    } catch (err) {
      setError(err.message)
      fetchTareas()
    } finally {
      setAplicandoBulk(false)
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

  const cargarPreset = async (preset) => {
    setShowPresetMenu(false)
    setCargandoPreset(true)
    setError(null)
    try {
      await Promise.all(
        preset.tareas.map((descripcion) =>
          api('/tareas', { method: 'POST', body: { tkid, descripcion, prioridad: 'media' } }),
        ),
      )
      fetchTareas()
    } catch (err) {
      setError(err.message)
    } finally {
      setCargandoPreset(false)
    }
  }

  const setCampo = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }))

  const handleCardClick = (e, tareaid) => {
    if (e.shiftKey && lastClicked != null) {
      const ids = flatOrder.map((t) => t.tareaid)
      const i1 = ids.indexOf(lastClicked)
      const i2 = ids.indexOf(tareaid)
      if (i1 !== -1 && i2 !== -1) {
        const [start, end] = i1 < i2 ? [i1, i2] : [i2, i1]
        setSelected(new Set(ids.slice(start, end + 1)))
        return
      }
    }
    if (e.ctrlKey || e.metaKey) {
      setSelected((prev) => {
        const next = new Set(prev)
        if (next.has(tareaid)) next.delete(tareaid)
        else next.add(tareaid)
        return next
      })
      setLastClicked(tareaid)
      return
    }
    setSelected(new Set([tareaid]))
    setLastClicked(tareaid)
  }

  const handleDragStart = (e, tareaid) => {
    const idsAMover = selected.has(tareaid) && selected.size > 1 ? [...selected] : [tareaid]
    if (idsAMover.length === 1) setSelected(new Set())
    e.dataTransfer.setData('text/plain', JSON.stringify(idsAMover))
    e.dataTransfer.effectAllowed = 'move'
    setDraggingIds(idsAMover)
  }

  const handleDragEnd = () => {
    setDraggingIds([])
    setOverCol(null)
  }

  const handleDragOver = (e, colId) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (overCol !== colId) setOverCol(colId)
  }

  const handleDrop = (e, colId) => {
    e.preventDefault()
    try {
      const ids = JSON.parse(e.dataTransfer.getData('text/plain'))
      if (Array.isArray(ids) && ids.length) moverVarias(ids, colId)
    } catch {
      // ignora un drop sin datos válidos
    }
    setDraggingIds([])
    setOverCol(null)
  }

  const aplicarAsignar = async (usuario) => {
    if (!usuario || selected.size === 0) return
    setAplicandoBulk(true)
    setError(null)
    const ids = [...selected]
    try {
      await Promise.all(ids.map((tareaid) => api(`/tareas/${tareaid}`, { method: 'PUT', body: { usuario } })))
      fetchTareas()
      setSelected(new Set())
    } catch (err) {
      setError(err.message)
    } finally {
      setAplicandoBulk(false)
    }
  }

  const aplicarEstado = async (posestadoId) => {
    if (!posestadoId || selected.size === 0) return
    const ids = [...selected]
    setAplicandoBulk(true)
    await moverVarias(ids, Number(posestadoId))
    setAplicandoBulk(false)
    setSelected(new Set())
  }

  return (
    <div className="adm-panel">
      <div className="adm-panel-head">
        <h2>{title}</h2>
        <div className="adm-filters" style={{ position: 'relative' }} ref={presetRef}>
          {actions}
          {puedeCrear && (
            <>
              <button
                type="button"
                className={`tk-combo${showPresetMenu ? ' is-open' : ''}`}
                onClick={() => setShowPresetMenu((v) => !v)}
                disabled={cargandoPreset}
              >
                <span>{cargandoPreset ? 'Cargando…' : 'Cargar preset'}</span>
                <ChevronDown size={16} aria-hidden="true" />
              </button>
              {showPresetMenu && (
                <div className="tk-preset-menu" role="listbox">
                  {PRESETS.map((preset) => {
                    const Icon = preset.icon
                    return (
                      <button type="button" key={preset.id} role="option" onClick={() => cargarPreset(preset)}>
                        <span className="tk-preset-icon"><Icon size={16} aria-hidden="true" /></span>
                        <span className="tk-preset-text">
                          <strong>{preset.label}</strong>
                          <span className="tk-preset-count">{preset.tareas.length} tareas</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
              <button type="button" className="adm-btn" onClick={() => setShowForm(true)}>
                <Plus aria-hidden="true" /> Nueva tarea
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="adm-error" role="alert">
          {error}
        </div>
      )}

      {selected.size > 0 && (
        <div className="tk-bulkbar">
          <span className="tk-bulk-count">{selected.size} seleccionada{selected.size === 1 ? '' : 's'}</span>
          <button type="button" className="tk-bulk-link" onClick={() => setSelected(new Set(flatOrder.map((t) => t.tareaid)))}>
            Seleccionar todas
          </button>
          <button type="button" className="tk-bulk-link" onClick={() => setSelected(new Set())}>
            Deseleccionar
          </button>
          <span className="tk-bulk-sep" />
          <select
            className="tk-bulk-select"
            defaultValue=""
            disabled={aplicandoBulk}
            onChange={(e) => { aplicarAsignar(e.target.value); e.target.value = '' }}
          >
            <option value="" disabled>Asignar a…</option>
            {usuarios.map((u) => (
              <option key={u.usuario} value={u.usuario}>{u.usuario}</option>
            ))}
          </select>
          <select
            className="tk-bulk-select"
            defaultValue=""
            disabled={aplicandoBulk}
            onChange={(e) => { aplicarEstado(e.target.value); e.target.value = '' }}
          >
            <option value="" disabled>Marcar como…</option>
            {columnas.map((col) => (
              <option key={col.id} value={col.id}>{col.titulo}</option>
            ))}
          </select>
          <span className="tk-bulk-sep" />
          <button type="button" className="tk-bulk-danger" onClick={eliminarVarias} disabled={aplicandoBulk}>
            Eliminar seleccionadas
          </button>
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
          {columnas.map((col) => {
            const deColumna = tareas.filter((t) => t.estado_actual === col.nombre)
            return (
              <section
                key={col.id}
                className={`tk-col${overCol === col.id ? ' tk-col--over' : ''}`}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDrop={(e) => handleDrop(e, col.id)}
                onDragLeave={() => overCol === col.id && setOverCol(null)}
              >
                <header className="adm-kanban-header">
                  <span className="tk-col-title">
                    <span className="tk-col-dot" data-tone={col.tono} />
                    {col.titulo}
                  </span>
                  <span className="adm-kanban-count">{deColumna.length}</span>
                </header>
                <div className="adm-kanban-cards">
                  {deColumna.length === 0 && <div className="adm-kanban-empty">Sin tareas</div>}
                  {deColumna.map((t) => {
                    const vencida = estaVencida(t)
                    const isSelected = selected.has(t.tareaid)
                    return (
                      <article
                        key={t.tareaid}
                        className={`adm-kanban-card tk-card${draggingIds.includes(t.tareaid) ? ' tk-card--dragging' : ''}${col.nombre === 'completada' ? ' tk-card--completa' : ''}${isSelected ? ' tk-card--selected' : ''}`}
                        draggable
                        onClick={(e) => handleCardClick(e, t.tareaid)}
                        onDragStart={(e) => handleDragStart(e, t.tareaid)}
                        onDragEnd={handleDragEnd}
                      >
                        <div className="adm-kanban-card-head">
                          <span className={`adm-kanban-priority tk-prioridad--${t.prioridad}`}>
                            {t.prioridad}
                          </span>
                          <span className="tk-drag" aria-hidden="true">
                            <span /><span /><span /><span /><span /><span />
                          </span>
                          {showDelete && (
                            <div className="tk-kebab-wrap">
                              <button
                                type="button"
                                className="tk-kebab"
                                aria-label="Más acciones"
                                onClick={(e) => { e.stopPropagation(); setMenuAbierto((m) => (m === t.tareaid ? null : t.tareaid)) }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2.2" /><circle cx="12" cy="12" r="2.2" /><circle cx="12" cy="19" r="2.2" /></svg>
                              </button>
                              {menuAbierto === t.tareaid && (
                                <div className="tk-kebab-menu">
                                  <button
                                    type="button"
                                    className="is-danger"
                                    onClick={(e) => { e.stopPropagation(); setMenuAbierto(null); eliminarTarea(t.tareaid) }}
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {editando?.tareaid === t.tareaid && editando.campo === 'descripcion' ? (
                          <input
                            className="tk-edit-input"
                            autoFocus
                            defaultValue={t.descripcion}
                            onClick={(e) => e.stopPropagation()}
                            onBlur={(e) => guardarCampo(t.tareaid, 'descripcion', e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') e.target.blur()
                              if (e.key === 'Escape') setEditando(null)
                            }}
                          />
                        ) : (
                          <p
                            className="adm-kanban-desc"
                            onDoubleClick={(e) => { e.stopPropagation(); setEditando({ tareaid: t.tareaid, campo: 'descripcion' }) }}
                          >
                            {t.descripcion}
                          </p>
                        )}

                        <div className="tk-meta">
                          {editando?.tareaid === t.tareaid && editando.campo === 'fechalimite' ? (
                            <input
                              type="date"
                              className="tk-edit-date"
                              autoFocus
                              defaultValue={t.fechalimite || ''}
                              onClick={(e) => e.stopPropagation()}
                              onBlur={() => setEditando(null)}
                              onChange={(e) => guardarCampo(t.tareaid, 'fechalimite', e.target.value || null)}
                            />
                          ) : (
                            <span
                              className={`tk-due${vencida ? ' tk-due--overdue' : ''}`}
                              onDoubleClick={(e) => { e.stopPropagation(); setEditando({ tareaid: t.tareaid, campo: 'fechalimite' }) }}
                            >
                              {t.fechalimite
                                ? new Date(t.fechalimite).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
                                : 'Sin fecha'}
                            </span>
                          )}

                          {editando?.tareaid === t.tareaid && editando.campo === 'usuario' ? (
                            <select
                              className="tk-edit-select"
                              autoFocus
                              defaultValue={t.usuario || ''}
                              onClick={(e) => e.stopPropagation()}
                              onBlur={() => setEditando(null)}
                              onChange={(e) => guardarCampo(t.tareaid, 'usuario', e.target.value || null)}
                            >
                              <option value="">Sin asignar</option>
                              {usuarios.map((u) => (
                                <option key={u.usuario} value={u.usuario}>{u.usuario}</option>
                              ))}
                            </select>
                          ) : t.usuario ? (
                            <span
                              className="tk-who"
                              onDoubleClick={(e) => { e.stopPropagation(); setEditando({ tareaid: t.tareaid, campo: 'usuario' }) }}
                            >
                              <span className="tk-who-avatar">{iniciales(t.usuario)}</span>
                            </span>
                          ) : (
                            <span
                              className="tk-who-empty"
                              onDoubleClick={(e) => { e.stopPropagation(); setEditando({ tareaid: t.tareaid, campo: 'usuario' }) }}
                            >
                              Sin asignar
                            </span>
                          )}
                        </div>
                      </article>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
