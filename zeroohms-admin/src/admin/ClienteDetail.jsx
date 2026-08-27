import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client.js'
import { estadoClass, formatEstado } from '../utils/format.js'

export default function ClienteDetail() {
  const { dni } = useParams()
  const navigate = useNavigate()
  const [cliente, setCliente] = useState(null)
  const [dispositivos, setDispositivos] = useState([])
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ nombre: '', apellido: '', email: '', telefono: '', contacto: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api(`/clientes/${dni}`),
      api(`/dispositivos?dni=${dni}`),
      api(`/clientes/${dni}/tickets`),
    ])
      .then(([c, d, t]) => {
        setCliente(c)
        setForm({
          nombre: c.nombre || '',
          apellido: c.apellido || '',
          email: c.email || '',
          telefono: c.telefono || '',
          contacto: c.contacto || '',
          direccion: c.direccion || '',
          observaciones: c.observaciones || '',
        })
        setDispositivos(d)
        setTickets(t)
      })
      .catch(() => navigate('/clientes'))
      .finally(() => setLoading(false))
  }, [dni, navigate])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const updated = await api(`/clientes/${dni}`, {
        method: 'PUT',
        body: {
          nombre: form.nombre.trim() || null,
          apellido: form.apellido.trim() || null,
          email: form.email.trim() || null,
          telefono: form.telefono.trim() || null,
          contacto: form.contacto.trim() || null,
          direccion: form.direccion.trim() || null,
          observaciones: form.observaciones.trim() || null,
        },
      })
      setCliente(updated)
      setEditing(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('¿Eliminar este cliente? Solo se puede si no tiene tickets asociados.')) return
    try {
      await api(`/clientes/${dni}`, { method: 'DELETE' })
      navigate('/clientes')
    } catch (err) {
      window.alert('Error: ' + err.message)
    }
  }

  if (loading) return <div className="adm-loading">Cargando cliente…</div>
  if (!cliente) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="adm-panel">
        <div className="adm-panel-head">
          <h2>{editing ? 'Editar cliente' : `${cliente.nombre || ''} ${cliente.apellido || ''}`}</h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {editing ? (
              <>
                <button className="adm-btn adm-btn--primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
                <button className="adm-btn adm-btn--ghost" onClick={() => { setEditing(false); setForm({ nombre: cliente.nombre || '', apellido: cliente.apellido || '', email: cliente.email || '', telefono: cliente.telefono || '', contacto: cliente.contacto || '', direccion: cliente.direccion || '', observaciones: cliente.observaciones || '' }); setError('') }}>
                  Cancelar
                </button>
              </>
            ) : (
              <>
                <button className="adm-btn adm-btn--ghost" onClick={() => setEditing(true)}>
                  Editar
                </button>
                <button
                  className="adm-btn adm-btn--ghost"
                  style={{ color: '#f87171', borderColor: 'rgba(239,68,68,0.4)' }}
                  onClick={handleDelete}
                >
                  Eliminar
                </button>
              </>
            )}
          </div>
        </div>

        {editing ? (
          <div className="adm-form">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="adm-field">
                <label>Nombre</label>
                <input type="text" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
              </div>
              <div className="adm-field">
                <label>Apellido</label>
                <input type="text" value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} />
              </div>
            </div>
            <div className="adm-field">
              <label>Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="adm-field">
              <label>Teléfono</label>
              <input type="text" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
            </div>
            <div className="adm-field">
              <label>Contacto adicional</label>
              <input type="text" value={form.contacto} onChange={(e) => setForm({ ...form, contacto: e.target.value })} />
            </div>
            <div className="adm-field">
              <label>Dirección</label>
              <input type="text" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
            </div>
            <div className="adm-field">
              <label>Observaciones</label>
              <textarea value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} />
            </div>
            {error && <p className="adm-error" role="alert">{error}</p>}
          </div>
        ) : (
          <div className="adm-detail-grid">
            <div className="adm-detail-item">
              <span className="adm-detail-label">DNI</span>
              <span className="adm-detail-value">{cliente.dni}</span>
            </div>
            <div className="adm-detail-item">
              <span className="adm-detail-label">Email</span>
              <span className="adm-detail-value">{cliente.email || '—'}</span>
            </div>
            <div className="adm-detail-item">
              <span className="adm-detail-label">Teléfono</span>
              <span className="adm-detail-value">{cliente.telefono || '—'}</span>
            </div>
            <div className="adm-detail-item">
              <span className="adm-detail-label">Contacto</span>
              <span className="adm-detail-value">{cliente.contacto || '—'}</span>
            </div>
            <div className="adm-detail-item">
              <span className="adm-detail-label">Dirección</span>
              <span className="adm-detail-value">{cliente.direccion || '—'}</span>
            </div>
            <div className="adm-detail-item" style={{ gridColumn: '1 / -1' }}>
              <span className="adm-detail-label">Observaciones</span>
              <span className="adm-detail-value">{cliente.observaciones || '—'}</span>
            </div>
          </div>
        )}
      </div>

      <div className="adm-panel">
        <h2>Dispositivos ({dispositivos.length})</h2>
        {dispositivos.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>Este cliente no tiene dispositivos registrados.</p>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Marca</th>
                  <th>Modelo</th>
                  <th>N° de serie</th>
                </tr>
              </thead>
              <tbody>
                {dispositivos.map((d) => (
                  <tr key={d.dispositivoid}>
                    <td className="adm-td-id">#{d.dispositivoid}</td>
                    <td>{d.marca || '—'}</td>
                    <td>{d.modelo || '—'}</td>
                    <td>{d.numeroserie || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="adm-panel">
        <h2>Tickets ({tickets.length})</h2>
        {tickets.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>Este cliente no tiene tickets.</p>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Estado</th>
                  <th>Código</th>
                  <th>Fecha</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.tkid}>
                    <td className="adm-td-id">#{t.tkid}</td>
                    <td>
                      <span className={`adm-status adm-status--${estadoClass(t.estado_actual)}`}>
                        {formatEstado(t.estado_actual)}
                      </span>
                    </td>
                    <td>{t.codigoseguimiento || '—'}</td>
                    <td>{t.fechacreacion ? new Date(t.fechacreacion).toLocaleDateString('es-AR') : '—'}</td>
                    <td>
                      <Link to={`/tickets/${t.tkid}`} className="adm-btn adm-btn--ghost">
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
