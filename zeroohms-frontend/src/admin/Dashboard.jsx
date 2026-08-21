import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client.js'
import { formatEstado, estadoClass } from '../utils/format.js'
import { Plus, Inbox } from 'pixelarticons/react'

export default function Dashboard() {
  const [tickets, setTickets] = useState([])
  const [clientes, setClientes] = useState([])
  const [tareas, setTareas] = useState([])
  const [presupuestos, setPresupuestos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api('/tickets?per_page=200'),
      api('/clientes?per_page=200'),
      api('/tareas?per_page=200'),
      api('/presupuestos?per_page=200'),
    ])
      .then(([t, c, ta, p]) => {
        setTickets(t)
        setClientes(c)
        setTareas(ta)
        setPresupuestos(p)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const stats = {
    total: tickets.length,
    creados: tickets.filter((t) => t.estado_actual === 'ticket_creado').length,
    diagnosticos: tickets.filter((t) => t.estado_actual === 'diagnostico_realizado').length,
    esperandoAprobacion: tickets.filter((t) => t.estado_actual === 'esperando_aprobacion').length,
    enReparacion: tickets.filter((t) => t.estado_actual === 'en_reparacion').length,
    listos: tickets.filter((t) => t.estado_actual === 'listo_para_retirar').length,
    clientes: clientes.length,
    tareasPendientes: tareas.filter((t) => t.estado_actual === 'pendiente').length,
    presupuestosPendientes: presupuestos.filter((p) => p.estado_actual === 'borrador').length,
  }

  const recent = [...tickets]
    .sort((a, b) => new Date(b.fechacreacion) - new Date(a.fechacreacion))
    .slice(0, 5)

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="adm-stats">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="adm-stat-card adm-skeleton" aria-hidden="true" />
          ))}
        </div>
        <div className="adm-panel adm-skeleton adm-skeleton--panel" aria-hidden="true" />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="adm-stats">
        <div className="adm-stat-card">
          <span className="adm-stat-value">{stats.total}</span>
          <span className="adm-stat-label">Total tickets</span>
        </div>
        <div className="adm-stat-card">
          <span className="adm-stat-value">{stats.creados}</span>
          <span className="adm-stat-label">Recién creados</span>
        </div>
        <div className="adm-stat-card">
          <span className="adm-stat-value">{stats.diagnosticos}</span>
          <span className="adm-stat-label">Diagnosticados</span>
        </div>
        <div className="adm-stat-card">
          <span className="adm-stat-value">{stats.esperandoAprobacion}</span>
          <span className="adm-stat-label">Esperando aprobación</span>
        </div>
        <div className="adm-stat-card">
          <span className="adm-stat-value">{stats.enReparacion}</span>
          <span className="adm-stat-label">En reparación</span>
        </div>
        <div className="adm-stat-card adm-stat-card--accent">
          <span className="adm-stat-value">{stats.listos}</span>
          <span className="adm-stat-label">Listos para retirar</span>
        </div>
      </div>

      <div className="adm-stats">
        <div className="adm-stat-card">
          <span className="adm-stat-value">{stats.clientes}</span>
          <span className="adm-stat-label">Clientes</span>
        </div>
        <div className="adm-stat-card">
          <span className="adm-stat-value">{stats.tareasPendientes}</span>
          <span className="adm-stat-label">Tareas pendientes</span>
        </div>
        <div className="adm-stat-card">
          <span className="adm-stat-value">{stats.presupuestosPendientes}</span>
          <span className="adm-stat-label">Presupuestos borrador</span>
        </div>
      </div>

      <div className="adm-panel">
        <div className="adm-panel-head">
          <h2><Inbox size={20} /> Tickets recientes</h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Link to="/admin/tickets" className="adm-btn adm-btn--ghost">
              Ver todos
            </Link>
            <Link to="/admin/tickets/nuevo" className="adm-btn adm-btn--primary">
              <Plus size={16} /> Nuevo ticket
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
                <th>Fecha</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {recent.map((t) => (
                <tr key={t.tkid}>
                  <td className="adm-td-id">#{t.tkid}</td>
                  <td>{t.codigoseguimiento || '—'}</td>
                  <td>{t.descripcionproblema || '—'}</td>
                  <td>
                    <span className={`adm-status adm-status--${estadoClass(t.estado_actual)}`}>
                      {formatEstado(t.estado_actual)}
                    </span>
                  </td>
                  <td>{t.fechacreacion ? new Date(t.fechacreacion).toLocaleDateString('es-AR') : '—'}</td>
                  <td>
                    <Link to={`/admin/tickets/${t.tkid}`} className="adm-btn adm-btn--ghost">
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr>
                  <td colSpan="6" className="adm-empty">No hay tickets todavía.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
