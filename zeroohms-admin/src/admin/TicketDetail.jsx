import { useState, useEffect, useCallback } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { api, apiBlob } from '../api/client.js'
import { estadoClass, formatEstado, formatRelativo, nombreCompleto } from '../utils/format.js'
import TareaKanban from '../components/tickets/TareaKanban.jsx'
import TicketFlowStepper from '../components/tickets/TicketFlowStepper.jsx'
import AsignarClienteModal from '../components/tickets/AsignarClienteModal.jsx'
import FotosTicket from '../components/tickets/FotosTicket.jsx'
import PresupuestoEditor from '../components/tickets/PresupuestoEditor.jsx'

const TABS = ['info', 'tareas', 'fotos', 'presupuesto', 'checklist']

export default function TicketDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [changing, setChanging] = useState(false)
  const [tab, setTab] = useState('info')
  const [showAsignar, setShowAsignar] = useState(false)

  const [estados, setEstados] = useState([])
  const [estadosLoading, setEstadosLoading] = useState(true)

  const [checklists, setChecklists] = useState([])
  const [checklistSeleccionada, setChecklistSeleccionada] = useState(null)
  const [preguntas, setPreguntas] = useState([])
  const [respuestas, setRespuestas] = useState({})
  const [cargandoChecklist, setCargandoChecklist] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [errorChecklist, setErrorChecklist] = useState('')
  const [exito, setExito] = useState(false)
  const [deletingEj, setDeletingEj] = useState(null)
  const [usuarios, setUsuarios] = useState([])

  const fetchEstados = useCallback(async () => {
    setEstadosLoading(true)
    try {
      const data = await api('/tickets/estados')
      setEstados(data)
    } catch (e) {
      console.error('Error fetching estados:', e)
      setEstados([])
    } finally {
      setEstadosLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEstados()
  }, [fetchEstados])

  useEffect(() => {
    setLoading(true)
    api(`/tickets/${id}`)
      .then(setTicket)
      .catch(() => navigate('/tickets'))
      .finally(() => setLoading(false))
    api('/checklists').then(setChecklists).catch(() => setChecklists([]))
  }, [id, navigate])

  useEffect(() => {
    api('/usuarios?per_page=100').then(setUsuarios).catch(() => setUsuarios([]))
  }, [])

  const nombreAsignado = (username) => {
    if (!username) return ''
    const u = usuarios.find((usr) => usr.usuario === username)
    return u ? nombreCompleto(u) : username
  }

  const fetchTicket = () => {
    setLoading(true)
    api(`/tickets/${id}`)
      .then(setTicket)
      .catch(() => navigate('/tickets'))
      .finally(() => setLoading(false))
  }

  const handleStateChange = async (posestadoId) => {
    const nuevoEstado = estados.find(e => e.id === posestadoId)
    if (!nuevoEstado) return

    // Optimistic update
    const estadoAnterior = ticket.estado_actual
    setTicket(prev => prev ? { ...prev, estado_actual: nuevoEstado.nombre } : null)
    setChanging(true)

    try {
      await api(`/tickets/${id}/estado`, {
        method: 'POST',
        body: { posestado_id: posestadoId },
      })
      fetchTicket()
    } catch (err) {
      // Rollback on error
      setTicket(prev => prev ? { ...prev, estado_actual: estadoAnterior } : null)
      console.error('Error cambiando estado:', err)
    } finally {
      setChanging(false)
    }
  }

  const handleDeleteEj = async (ejecucionid) => {
    if (!window.confirm('¿Eliminar esta ejecución?')) return
    setDeletingEj(ejecucionid)
    try {
      await api(`/ejecuciones/${ejecucionid}`, { method: 'DELETE' })
      fetchTicket()
    } finally {
      setDeletingEj(null)
    }
  }

  const [generandoPdf, setGenerandoPdf] = useState(null)

  const abrirPdf = async (tipo) => {
    setGenerandoPdf(tipo)
    try {
      const blob = await apiBlob(`/tickets/${id}/${tipo}`)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
    } catch (err) {
      window.alert('No se pudo generar el PDF: ' + err.message)
    } finally {
      setGenerandoPdf(null)
    }
  }

  const handleDeleteTicket = async () => {
    if (!window.confirm('¿Eliminar este ticket? Esta acción no se puede deshacer.')) return
    try {
      await api(`/tickets/${id}`, { method: 'DELETE' })
      navigate('/tickets')
    } catch (err) {
      window.alert('Error: ' + err.message)
    }
  }

  const seleccionarChecklist = async (checklistid) => {
    if (!checklistid) {
      setChecklistSeleccionada(null)
      setPreguntas([])
      setRespuestas({})
      setExito(false)
      return
    }
    const cl = checklists.find((c) => String(c.checklistid) === String(checklistid))
    setChecklistSeleccionada(cl)
    setExito(false)
    setCargandoChecklist(true)
    setErrorChecklist('')
    try {
      const preg = await api(`/checklists/${checklistid}/preguntas`)
      setPreguntas(preg)
      const init = {}
      preg.forEach((p) => { init[p.preguntaid] = { respuestaid: '', observacion: '' } })
      setRespuestas(init)
    } catch {
      setErrorChecklist('Error al cargar las preguntas')
    } finally {
      setCargandoChecklist(false)
    }
  }

  const handleRespuesta = (preguntaId, field, value) => {
    setRespuestas((prev) => ({ ...prev, [preguntaId]: { ...prev[preguntaId], [field]: value } }))
  }

  const handleEnviarChecklist = async () => {
    setEnviando(true)
    setErrorChecklist('')
    try {
      const respArray = Object.entries(respuestas)
        .filter(([, r]) => r.respuestaid)
        .map(([preguntaId, r]) => ({
          preguntaid: Number(preguntaId),
          respuestaid: Number(r.respuestaid),
          observacion: r.observacion || null,
        }))

      if (respArray.length === 0) {
        setErrorChecklist('Seleccioná al menos una respuesta.')
        setEnviando(false)
        return
      }

      await api('/ejecuciones', {
        method: 'POST',
        body: {
          checklistid: checklistSeleccionada.checklistid,
          tkid: Number(id),
          respuestas: respArray,
        },
      })
      setExito(true)
      setChecklistSeleccionada(null)
      setPreguntas([])
      setRespuestas({})
      fetchTicket()
    } catch (err) {
      setErrorChecklist(err.message)
    } finally {
      setEnviando(false)
    }
  }

  const ejecuciones = ticket?.ejecuciones || []
  const ordenadas = [...ejecuciones].sort((a, b) => {
    const fa = a.fechacreacion ? new Date(a.fechacreacion) : 0
    const fb = b.fechacreacion ? new Date(b.fechacreacion) : 0
    return fa - fb
  })

  if (loading) return <div className="adm-loading">Cargando ticket…</div>
  if (!ticket) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <nav className="adm-crumb">
        <Link to="/tickets">Tickets</Link>
        <span>›</span>
        <strong>#{ticket.tkid}</strong>
      </nav>

      <div className="tk-head">
        <h1 className="tk-head-title">Ticket #{ticket.tkid}</h1>
        <span className={`adm-status adm-status--${estadoClass(ticket.estado_actual)}`}>
          {formatEstado(ticket.estado_actual)}
        </span>
        <span className="tk-head-code">{ticket.codigoseguimiento || ''}</span>
        <div className="tk-head-actions">
          <button
            className="adm-btn adm-btn--subtle"
            onClick={() => abrirPdf('recibo')}
            disabled={generandoPdf === 'recibo'}
          >
            {generandoPdf === 'recibo' ? 'Generando…' : 'Imprimir recibo'}
          </button>
          <button
            className="adm-btn adm-btn--ghost"
            style={{ color: '#f87171', borderColor: 'rgba(239,68,68,0.4)' }}
            onClick={handleDeleteTicket}
          >
            Eliminar ticket
          </button>
        </div>
      </div>

      <div className="adm-tabs">
        {TABS.map((t) => (
          <button
            key={t}
            className={`adm-tab${tab === t ? ' is-active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'info' && 'Información'}
            {t === 'tareas' && 'Tareas'}
            {t === 'fotos' && `Fotos${ticket.fotos?.length ? ` (${ticket.fotos.length})` : ''}`}
            {t === 'presupuesto' && 'Presupuesto'}
            {t === 'checklist' && 'Checklist'}
          </button>
        ))}
      </div>

        {tab === 'info' && (
          <div className="tk-info-grid">
            <div className="tk-info-col">
              <div className="adm-panel">
                <div className="adm-panel-head">
                  <h2>Cliente y equipo</h2>
                  <button type="button" className="adm-btn adm-btn--subtle adm-btn--sm" onClick={() => setShowAsignar(true)}>
                    Cambiar cliente
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div className="adm-detail-grid">
                    <div className="adm-detail-item" style={{ gridColumn: '1 / -1' }}>
                      <span className="adm-detail-label">Cliente</span>
                      <span className="adm-detail-value">
                        {ticket.propietario_nombre || '—'} {ticket.propietario_apellido || ''}
                      </span>
                    </div>
                    <div className="adm-detail-item">
                      <span className="adm-detail-label">DNI</span>
                      <span className="adm-detail-value">{ticket.propietario_dni || '—'}</span>
                    </div>
                    <div className="adm-detail-item">
                      <span className="adm-detail-label">Teléfono</span>
                      <span className="adm-detail-value">{ticket.propietario_telefono || '—'}</span>
                    </div>
                    <div className="adm-detail-item" style={{ gridColumn: '1 / -1' }}>
                      <span className="adm-detail-label">Email</span>
                      <span className="adm-detail-value">{ticket.propietario_email || '—'}</span>
                    </div>
                  </div>

                  <div className="adm-detail-grid">
                    <div className="adm-detail-item" style={{ gridColumn: '1 / -1' }}>
                      <span className="adm-detail-label">Equipo</span>
                      <span className="adm-detail-value">
                        {[ticket.dispositivo_marca, ticket.dispositivo_modelo].filter(Boolean).join(' ') || '—'}
                      </span>
                    </div>
                    <div className="adm-detail-item" style={{ gridColumn: '1 / -1' }}>
                      <span className="adm-detail-label">Número de serie</span>
                      <span className="adm-detail-value">{ticket.dispositivo_numeroserie || '—'}</span>
                    </div>
                    <div className="adm-detail-item" style={{ gridColumn: '1 / -1' }}>
                      <span className="adm-detail-label">Técnico asignado</span>
                      <span className="adm-detail-value">{nombreAsignado(ticket.usuario) || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="adm-panel">
                <h2>Problema reportado</h2>
                <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.78)', lineHeight: 1.55, margin: 0 }}>
                  {ticket.descripcionproblema || '—'}
                </p>
              </div>

              <div className="adm-panel">
                <div className="adm-panel-head">
                  <h2>Checklists en este ticket</h2>
                  <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => setTab('checklist')}>
                    Ver todas
                  </button>
                </div>
                {ejecuciones.length === 0 ? (
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', margin: 0 }}>
                    Todavía no se hizo ninguna checklist en este ticket.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {[...ejecuciones]
                      .sort((a, b) => new Date(b.fechacreacion) - new Date(a.fechacreacion))
                      .slice(0, 3)
                      .map((ej) => (
                        <div key={ej.ejecucionid} className="tk-checklist-row">
                          <span className="name">{ej.checklist_nombre || `Checklist #${ej.checklistid}`}</span>
                          <span className="when">completado {formatRelativo(ej.fechacreacion)}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            <div className="tk-info-col tk-info-col--side">
              <div className="adm-panel">
                <h2>Flujo del ticket</h2>
                <TicketFlowStepper
                  estados={estados}
                  historial={ticket.historial_estados || []}
                  estadoActual={ticket.estado_actual}
                  onChange={handleStateChange}
                  disabled={changing || estadosLoading}
                />
              </div>
            </div>
          </div>
        )}

        {tab === 'tareas' && (
          <div style={{ paddingTop: '1rem' }}>
            <TareaKanban tkid={id} />
          </div>
        )}

        {tab === 'fotos' && (
          <div style={{ paddingTop: '1rem' }}>
            <FotosTicket tkid={id} />
          </div>
        )}

        {tab === 'presupuesto' && (
          <div style={{ paddingTop: '1rem' }}>
            <PresupuestoEditor tkid={id} />
          </div>
        )}

        {tab === 'checklist' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingTop: '1rem' }}>
            <div className="adm-panel" style={{ background: 'transparent', border: 'none', padding: 0 }}>
              <h3 style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.75rem' }}>Ejecutar checklist</h3>

              {exito && (
                <div style={{ padding: '0.6rem 0.85rem', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '6px', fontSize: '0.85rem', color: '#6ee79f', marginBottom: '0.75rem' }}>
                  Checklist enviado correctamente.
                </div>
              )}

              <div className="adm-field">
                <label>Seleccionar checklist</label>
                <select
                  value={checklistSeleccionada?.checklistid || ''}
                  onChange={(e) => seleccionarChecklist(e.target.value)}
                >
                  <option value="">— Elegí una checklist —</option>
                  {checklists.map((c) => (
                    <option key={c.checklistid} value={c.checklistid}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              {cargandoChecklist && <div className="adm-loading">Cargando preguntas…</div>}

              {checklistSeleccionada && !cargandoChecklist && preguntas.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
                  {checklistSeleccionada.descripcion && (
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: 0 }}>{checklistSeleccionada.descripcion}</p>
                  )}

                  {preguntas.map((p, idx) => (
                    <div key={p.preguntaid} className="chk-question">
                      <label><span className="chk-num">{idx + 1}</span>{p.pregunta}</label>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {p.respuestas_validas.map((r) => (
                          <button
                            key={r.respuestaid}
                            type="button"
                            className={`adm-filter${respuestas[p.preguntaid]?.respuestaid === String(r.respuestaid) ? ' is-active' : ''}`}
                            onClick={() => handleRespuesta(p.preguntaid, 'respuestaid', String(r.respuestaid))}
                          >
                            {r.respuesta}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        placeholder="Observación (opcional)"
                        value={respuestas[p.preguntaid]?.observacion || ''}
                        onChange={(e) => handleRespuesta(p.preguntaid, 'observacion', e.target.value)}
                        style={{
                          marginTop: '0.25rem', padding: '0.5rem 0.75rem', fontSize: '0.85rem',
                          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '6px', color: '#fff', outline: 'none',
                        }}
                      />
                    </div>
                  ))}

                  {errorChecklist && <p className="adm-error" role="alert">{errorChecklist}</p>}

                  <div>
                    <button className="adm-btn adm-btn--primary" onClick={handleEnviarChecklist} disabled={enviando}>
                      {enviando ? 'Enviando…' : 'Enviar checklist'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', margin: 0 }}>
                  Historial ({ejecuciones.length})
                </h3>
                <button
                  type="button"
                  className="adm-btn adm-btn--subtle adm-btn--sm"
                  onClick={() => abrirPdf('informe')}
                  disabled={generandoPdf === 'informe'}
                >
                  {generandoPdf === 'informe' ? 'Generando…' : 'Imprimir informe técnico'}
                </button>
              </div>

              {ordenadas.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>
                  No se realizaron checklists en este ticket.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {ordenadas.map((ej, idx) => {
                    const fecha = ej.fechacreacion ? new Date(ej.fechacreacion) : null
                    return (
                      <div key={ej.ejecucionid} style={{ padding: '1rem', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{ej.checklist_nombre || `Checklist #${ej.checklistid}`}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button
                              className="adm-btn adm-btn--ghost"
                              style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', color: '#f87171', borderColor: 'rgba(239,68,68,0.4)' }}
                              disabled={deletingEj === ej.ejecucionid}
                              onClick={() => handleDeleteEj(ej.ejecucionid)}
                            >
                              Eliminar
                            </button>
                            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>
                              {fecha ? fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                              {fecha ? ` ${fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}` : ''}
                            </span>
                            <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '10px', background: idx === 0 ? 'rgba(59,130,246,0.15)' : 'rgba(240,81,59,0.15)', color: idx === 0 ? '#7ab0ff' : '#ff8a74', fontWeight: 600 }}>
                              {idx === 0 ? 'Primera' : `#${idx + 1}`}
                            </span>
                          </div>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                          Realizada por: {nombreAsignado(ej.usuario) || '—'}
                        </div>
                        <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          {ej.respuestas?.map((r, ri) => (
                            <div key={ri} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.85rem' }}>
                              <span style={{ color: 'rgba(255,255,255,0.5)', minWidth: '160px' }}>{r.pregunta_texto || `Pregunta ${r.preguntaid}`}</span>
                              <span style={{ color: '#fff', fontWeight: 500 }}>{r.respuesta_texto || '—'}</span>
                              {r.observacion && <span style={{ color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>({r.observacion})</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

      {showAsignar && (
        <AsignarClienteModal
          tkid={id}
          ticketActual={ticket}
          onClose={() => setShowAsignar(false)}
          onAsignado={fetchTicket}
        />
      )}
    </div>
  )
}
