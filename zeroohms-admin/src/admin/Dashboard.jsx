import { useState, useEffect } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { api } from '../api/client.js'
import { formatEstado, estadoClass, formatMoney, diasDesde, tonoAntiguedad, iniciales, nombreCompleto } from '../utils/format.js'
import {
  Plus, Inbox, Cpu, Clock, CheckDouble, Users, SquareAlert, Wallet,
  ClipboardNote, Settings2, ChartBarBig, ArrowRight, Human,
} from 'pixelarticons/react'

const ESTADOS_TERMINALES = ['entregado', 'cancelado']
const UMBRAL_ESTANCADO = 6

const DONUT_STAGES = [
  { key: 'ticket_creado', label: 'Creados', color: '#7ab0ff' },
  { key: 'diagnostico_realizado', label: 'Diagnosticados', color: '#c99cff' },
  { key: 'esperando_aprobacion', label: 'Esperando aprobación', color: '#f5c46a' },
  { key: 'en_reparacion', label: 'En reparación', color: '#F0513B' },
  { key: 'listo_para_retirar', label: 'Listos', color: '#6ee79f' },
]

function DonutChart({ segments, size = 148, strokeWidth = 20 }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const total = segments.reduce((sum, seg) => sum + seg.value, 0)
  let offset = 0

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="adm-donut" role="img" aria-label="Distribución de tickets por estado">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={strokeWidth}
      />
      {total > 0 && segments.map((seg) => {
        if (seg.value === 0) return null
        const fraction = seg.value / total
        const dash = fraction * circumference
        const rotation = (offset / total) * 360 - 90
        offset += seg.value
        return (
          <circle
            key={seg.key}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${dash} ${circumference - dash}`}
            transform={`rotate(${rotation} ${size / 2} ${size / 2})`}
          />
        )
      })}
      <text x="50%" y="46%" textAnchor="middle" className="adm-donut-value">{total}</text>
      <text x="50%" y="63%" textAnchor="middle" className="adm-donut-label">tickets</text>
    </svg>
  )
}

export default function Dashboard() {
  const { user } = useOutletContext() ?? {}
  const [tickets, setTickets] = useState([])
  const [clientes, setClientes] = useState([])
  const [tareas, setTareas] = useState([])
  const [presupuestos, setPresupuestos] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api('/tickets?per_page=100'),
      api('/clientes?per_page=100'),
      api('/tareas?per_page=100'),
      api('/presupuestos?per_page=100'),
      api('/usuarios?per_page=100'),
    ])
      .then(([t, c, ta, p, us]) => {
        setTickets(t)
        setClientes(c)
        setTareas(ta)
        setPresupuestos(p)
        setUsuarios(us)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const stats = {
    total: tickets.length,
    esperandoAprobacion: tickets.filter((t) => t.estado_actual === 'esperando_aprobacion').length,
    enReparacion: tickets.filter((t) => t.estado_actual === 'en_reparacion').length,
    listos: tickets.filter((t) => t.estado_actual === 'listo_para_retirar').length,
    clientes: clientes.length,
    tareasPendientes: tareas.filter((t) => t.estado_actual === 'pendiente').length,
    presupuestosPendientes: presupuestos.filter((p) => p.estado_actual === 'borrador').length,
  }

  const recent = [...tickets]
    .sort((a, b) => new Date(b.fechacreacion) - new Date(a.fechacreacion))
    .slice(0, 6)

  const inicioMes = new Date()
  inicioMes.setDate(1)
  inicioMes.setHours(0, 0, 0, 0)

  const presupuestosAprobadosMes = presupuestos.filter(
    (p) => p.estado_actual === 'aprobado' && p.fechacreacion && new Date(p.fechacreacion) >= inicioMes,
  )
  const facturacionMes = presupuestosAprobadosMes.reduce((sum, p) => sum + (p.monto || 0), 0)
  const ticketPromedio = presupuestosAprobadosMes.length ? facturacionMes / presupuestosAprobadosMes.length : 0
  const presupuestosPendientesMonto = presupuestos
    .filter((p) => p.estado_actual === 'borrador')
    .reduce((sum, p) => sum + (p.monto || 0), 0)

  const ticketsActivos = tickets.filter((t) => !ESTADOS_TERMINALES.includes(t.estado_actual))
  const antiguedades = ticketsActivos
    .map((t) => diasDesde(t.fecha_ultimo_cambio))
    .filter((d) => d != null)
  const antiguedadPromedio = antiguedades.length
    ? antiguedades.reduce((a, b) => a + b, 0) / antiguedades.length
    : 0
  const ticketsEstancados = ticketsActivos.filter(
    (t) => (diasDesde(t.fecha_ultimo_cambio) ?? 0) >= UMBRAL_ESTANCADO,
  )

  const cargaPorTecnico = Object.values(
    tareas.reduce((acc, t) => {
      const usuario = t.usuario
      if (!usuario) return acc
      if (!acc[usuario]) {
        const u = usuarios.find((usr) => usr.usuario === usuario)
        acc[usuario] = { nombre: u ? nombreCompleto(u) : usuario, activos: 0 }
      }
      if (t.estado_actual !== 'completada') acc[usuario].activos += 1
      return acc
    }, {}),
  )
    .filter((u) => u.activos > 0)
    .sort((a, b) => b.activos - a.activos)
    .slice(0, 5)
  const maxCarga = Math.max(1, ...cargaPorTecnico.map((u) => u.activos))

  const donutSegments = DONUT_STAGES.map((stage) => ({
    ...stage,
    value: tickets.filter((t) => t.estado_actual === stage.key).length,
  }))

  const today = new Date().toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  const firstName = user?.nombre || (user?.usuario ? user.usuario.split(' ')[0] : null)

  if (loading) {
    return (
      <div className="adm-dash">
        <div className="adm-stats">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="adm-stat-card adm-skeleton" style={{ minHeight: 96 }} aria-hidden="true" />
          ))}
        </div>
        <div className="adm-dash-grid">
          <div className="adm-panel adm-skeleton adm-skeleton--panel" aria-hidden="true" />
          <div className="adm-dash-side">
            <div className="adm-panel adm-skeleton" style={{ minHeight: 200 }} aria-hidden="true" />
            <div className="adm-panel adm-skeleton" style={{ minHeight: 160 }} aria-hidden="true" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="adm-dash">
      <div className="adm-dash-header">
        <div>
          <h1 className="adm-dash-title">{firstName ? `Hola, ${firstName}` : 'Resumen'}</h1>
          <p className="adm-dash-subtitle">{today} · así viene el taller hoy</p>
        </div>
        <div className="adm-dash-header-actions">
          <Link to="/tickets/nuevo" className="adm-btn adm-btn--primary">
            <Plus size={16} /> Nuevo ticket
          </Link>
        </div>
      </div>

      <div className="adm-row-label"><span>Operación de hoy</span><span className="adm-row-label-line" /></div>
      <div className="adm-stats">
        <div className="adm-stat-card">
          <div className="adm-stat-top">
            <span className="adm-stat-icon"><Inbox size={18} /></span>
          </div>
          <span className="adm-stat-value">{stats.total}</span>
          <span className="adm-stat-label">Total tickets</span>
        </div>

        <div className="adm-stat-card" data-tone="warning">
          <div className="adm-stat-top">
            <span className="adm-stat-icon"><Clock size={18} /></span>
          </div>
          <span className="adm-stat-value">{stats.esperandoAprobacion}</span>
          <span className="adm-stat-label">Esperando aprobación</span>
        </div>

        <div className="adm-stat-card adm-stat-card--accent">
          <div className="adm-stat-top">
            <span className="adm-stat-icon"><Cpu size={18} /></span>
          </div>
          <span className="adm-stat-value">{stats.enReparacion}</span>
          <span className="adm-stat-label">En reparación</span>
          {stats.total > 0 && (
            <div className="adm-stat-bar">
              <div className="adm-stat-bar-fill" style={{ width: `${(stats.enReparacion / stats.total) * 100}%` }} />
            </div>
          )}
        </div>

        <div className="adm-stat-card" data-tone="success">
          <div className="adm-stat-top">
            <span className="adm-stat-icon"><CheckDouble size={18} /></span>
          </div>
          <span className="adm-stat-value">{stats.listos}</span>
          <span className="adm-stat-label">Listos para retirar</span>
        </div>

        <div className="adm-stat-card" data-tone="info">
          <div className="adm-stat-top">
            <span className="adm-stat-icon"><Users size={18} /></span>
          </div>
          <span className="adm-stat-value">{stats.clientes}</span>
          <span className="adm-stat-label">Clientes</span>
        </div>

        <div className="adm-stat-card" data-tone="warning">
          <div className="adm-stat-top">
            <span className="adm-stat-icon"><SquareAlert size={18} /></span>
          </div>
          <span className="adm-stat-value">{stats.tareasPendientes}</span>
          <span className="adm-stat-label">Tareas pendientes</span>
        </div>
      </div>

      <div className="adm-row-label"><span>Negocio del mes</span><span className="adm-row-label-line" /></div>
      <div className="adm-stats adm-stats--month">
        <div className="adm-stat-card" data-tone="success">
          <div className="adm-stat-top">
            <span className="adm-stat-icon"><Wallet size={18} /></span>
          </div>
          <span className="adm-stat-value">{formatMoney(facturacionMes)}</span>
          <span className="adm-stat-label">Facturación del mes</span>
        </div>

        <div className="adm-stat-card">
          <div className="adm-stat-top">
            <span className="adm-stat-icon"><ChartBarBig size={18} /></span>
          </div>
          <span className="adm-stat-value">{formatMoney(ticketPromedio)}</span>
          <span className="adm-stat-label">Ticket promedio</span>
        </div>

        <div className="adm-stat-card" data-tone="warning">
          <div className="adm-stat-top">
            <span className="adm-stat-icon"><Clock size={18} /></span>
          </div>
          <span className="adm-stat-value">{formatMoney(presupuestosPendientesMonto)}</span>
          <span className="adm-stat-label">Presupuestos sin aprobar</span>
        </div>

        <div className="adm-stat-card" data-tone="info">
          <div className="adm-stat-top">
            <span className="adm-stat-icon"><Clock size={18} /></span>
          </div>
          <span className="adm-stat-value">{antiguedadPromedio.toFixed(1)} días</span>
          <span className="adm-stat-label">Antigüedad promedio en taller</span>
        </div>
      </div>

      <div className="adm-dash-grid">
        <div className="adm-dash-main">
          <div className="adm-panel">
            <div className="adm-panel-head">
              <h2><Inbox size={20} /> Tickets recientes</h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Link to="/tickets" className="adm-btn adm-btn--ghost adm-btn--sm">
                  Ver todos
                </Link>
              </div>
            </div>

            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Código</th>
                    <th>Problema</th>
                    <th>Estado</th>
                    <th>Antigüedad</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((t) => {
                    const dias = diasDesde(t.fecha_ultimo_cambio)
                    const tono = tonoAntiguedad(dias)
                    return (
                      <tr key={t.tkid}>
                        <td className="adm-td-id">#{t.tkid}</td>
                        <td>{t.codigoseguimiento || '—'}</td>
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
                          <Link to={`/tickets/${t.tkid}`} className="adm-btn adm-btn--ghost adm-btn--sm">
                            Ver
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                  {recent.length === 0 && (
                    <tr>
                      <td colSpan="6" className="adm-empty">
                        <Inbox size={28} />
                        No hay tickets todavía.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="adm-dash-side">
          <div className="adm-panel">
            <h2><ChartBarBig size={20} /> Estado de tickets</h2>
            <div className="adm-donut-wrap">
              <DonutChart segments={donutSegments} />
              <div className="adm-legend">
                {donutSegments.map((seg) => (
                  <div className="adm-legend-item" key={seg.key}>
                    <span className="adm-legend-dot" style={{ background: seg.color }} />
                    <span className="adm-legend-label">{seg.label}</span>
                    <span className="adm-legend-value">{seg.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="adm-panel">
            <h2><SquareAlert size={20} /> Requiere tu atención</h2>
            {(ticketsEstancados.length + stats.esperandoAprobacion + stats.tareasPendientes + stats.presupuestosPendientes) === 0 ? (
              <div className="adm-attention-empty">
                <CheckDouble size={18} /> Todo al día, no hay pendientes.
              </div>
            ) : (
              <div className="adm-attention-list">
                {ticketsEstancados.length > 0 && (
                  <Link to="/tickets" className="adm-attention-item adm-attention-item--hot">
                    <span className="adm-attention-icon adm-attention-icon--hot"><Clock size={16} /></span>
                    <span className="adm-attention-text">
                      <strong>Tickets estancados</strong>
                      <span>Más de {UMBRAL_ESTANCADO} días sin cambio de estado</span>
                    </span>
                    <span className="adm-attention-count">{ticketsEstancados.length}</span>
                    <ArrowRight size={16} />
                  </Link>
                )}
                {stats.esperandoAprobacion > 0 && (
                  <Link to="/tickets" className="adm-attention-item">
                    <span className="adm-attention-icon"><Clock size={16} /></span>
                    <span className="adm-attention-text">
                      <strong>Tickets esperando aprobación</strong>
                      <span>Presupuesto enviado, sin respuesta del cliente</span>
                    </span>
                    <span className="adm-attention-count">{stats.esperandoAprobacion}</span>
                    <ArrowRight size={16} />
                  </Link>
                )}
                {stats.tareasPendientes > 0 && (
                  <Link to="/tareas" className="adm-attention-item">
                    <span className="adm-attention-icon"><SquareAlert size={16} /></span>
                    <span className="adm-attention-text">
                      <strong>Tareas pendientes</strong>
                      <span>Todavía sin completar</span>
                    </span>
                    <span className="adm-attention-count">{stats.tareasPendientes}</span>
                    <ArrowRight size={16} />
                  </Link>
                )}
                {stats.presupuestosPendientes > 0 && (
                  <Link to="/presupuestos" className="adm-attention-item">
                    <span className="adm-attention-icon"><Wallet size={16} /></span>
                    <span className="adm-attention-text">
                      <strong>Presupuestos en borrador</strong>
                      <span>Falta enviarlos al cliente</span>
                    </span>
                    <span className="adm-attention-count">{stats.presupuestosPendientes}</span>
                    <ArrowRight size={16} />
                  </Link>
                )}
              </div>
            )}
          </div>

          {cargaPorTecnico.length > 0 && (
            <div className="adm-panel">
              <h2><Human size={20} /> Carga de trabajo por técnico</h2>
              <p className="adm-panel-sub">Tickets y tareas activas asignadas</p>
              <div className="adm-workload">
                {cargaPorTecnico.map((u) => (
                  <div className="adm-workload-row" key={u.nombre}>
                    <span className="adm-workload-avatar">{iniciales(u.nombre)}</span>
                    <span className="adm-workload-name">{u.nombre}</span>
                    <span className="adm-workload-track">
                      <span
                        className="adm-workload-fill"
                        style={{ width: `${(u.activos / maxCarga) * 100}%` }}
                      />
                    </span>
                    <span className="adm-workload-count">{u.activos} activos</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="adm-panel">
            <h2>Accesos rápidos</h2>
            <div className="adm-quick-grid">
              <Link to="/tickets/nuevo" className="adm-quick-action">
                <Plus size={18} />
                <span>Nuevo ticket</span>
              </Link>
              <Link to="/clientes/nuevo" className="adm-quick-action">
                <Users size={18} />
                <span>Nuevo cliente</span>
              </Link>
              <Link to="/checklists/nueva" className="adm-quick-action">
                <ClipboardNote size={18} />
                <span>Checklist</span>
              </Link>
              <Link to="/ajustes" className="adm-quick-action">
                <Settings2 size={18} />
                <span>Ajustes</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
