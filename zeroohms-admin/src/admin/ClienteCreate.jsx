import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client.js'

export default function ClienteCreate() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ dni: '', nombre: '', apellido: '', email: '', telefono: '', contacto: '', direccion: '', observaciones: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.dni.trim()) {
      setError('El DNI es obligatorio.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const data = await api('/clientes', {
        method: 'POST',
        body: {
          dni: form.dni.trim(),
          nombre: form.nombre.trim() || null,
          apellido: form.apellido.trim() || null,
          email: form.email.trim() || null,
          telefono: form.telefono.trim() || null,
          contacto: form.contacto.trim() || null,
          direccion: form.direccion.trim() || null,
          observaciones: form.observaciones.trim() || null,
        },
      })
      navigate(`/clientes/${data.dni}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="adm-panel" style={{ maxWidth: '600px' }}>
      <h2>Nuevo cliente</h2>

      <form className="adm-form" onSubmit={handleSubmit}>
        <div className="adm-field">
          <label>DNI *</label>
          <input type="text" value={form.dni} onChange={handleChange('dni')} placeholder="Ej: 40123456" />
        </div>
        <div className="adm-field">
          <label>Nombre</label>
          <input type="text" value={form.nombre} onChange={handleChange('nombre')} placeholder="Ej: María" />
        </div>
        <div className="adm-field">
          <label>Apellido</label>
          <input type="text" value={form.apellido} onChange={handleChange('apellido')} placeholder="Ej: Fernández" />
        </div>
        <div className="adm-field">
          <label>Email</label>
          <input type="email" value={form.email} onChange={handleChange('email')} placeholder="Ej: maria@email.com" />
        </div>
        <div className="adm-field">
          <label>Teléfono</label>
          <input type="text" value={form.telefono} onChange={handleChange('telefono')} placeholder="Ej: 11 1234-5678" />
        </div>
        <div className="adm-field">
          <label>Contacto adicional</label>
          <input type="text" value={form.contacto} onChange={handleChange('contacto')} placeholder="Opcional" />
        </div>
        <div className="adm-field">
          <label>Dirección</label>
          <input type="text" value={form.direccion} onChange={handleChange('direccion')} placeholder="Opcional" />
        </div>
        <div className="adm-field">
          <label>Observaciones</label>
          <textarea value={form.observaciones} onChange={handleChange('observaciones')} placeholder="Notas internas sobre el cliente…" />
        </div>

        {error && <p className="adm-error" role="alert">{error}</p>}

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="adm-btn adm-btn--primary" type="submit" disabled={saving}>
            {saving ? 'Creando…' : 'Crear cliente'}
          </button>
          <button className="adm-btn adm-btn--ghost" type="button" onClick={() => navigate('/clientes')}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
