import { useState, useEffect } from 'react'
import { api } from '../api/client.js'

export default function UsuariosForm({ initial, onClose, onSaved }) {
  const isEditing = !!initial
  const [form, setForm] = useState({
    usuario: '',
    nombre: '',
    apellido: '',
    mail: '',
    clave: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (initial) {
      setForm({
        usuario: initial.usuario,
        nombre: initial.nombre || '',
        apellido: initial.apellido || '',
        mail: initial.mail || '',
        clave: '',
      })
    }
  }, [initial])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (isEditing) {
        const body = {
          mail: form.mail.trim() || null,
          nombre: form.nombre.trim() || null,
          apellido: form.apellido.trim() || null,
        }
        if (form.clave.trim()) {
          body.clave = form.clave.trim()
        }
        await api(`/usuarios/${form.usuario}`, {
          method: 'PUT',
          body,
        })
      } else {
        await api('/usuarios', {
          method: 'POST',
          body: {
            usuario: form.usuario.trim(),
            nombre: form.nombre.trim() || null,
            apellido: form.apellido.trim() || null,
            mail: form.mail.trim() || null,
            clave: form.clave.trim(),
          },
        })
      }
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{
      padding: '1rem', background: 'rgba(255,255,255,0.04)', borderRadius: '8px',
      border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '0.75rem',
      marginBottom: '1rem',
    }}>
      <h3 style={{ margin: 0, fontSize: '1rem' }}>
        {isEditing ? `Editar usuario: ${initial.usuario}` : 'Crear usuario'}
      </h3>

      {!isEditing && (
        <div className="adm-field">
          <label>Usuario</label>
          <input
            type="text"
            value={form.usuario}
            onChange={(e) => setForm({ ...form, usuario: e.target.value })}
            placeholder="Ej: juanperez"
            maxLength={20}
            autoFocus
          />
        </div>
      )}

      {isEditing && (
        <div className="adm-field">
          <label>Usuario (no editable)</label>
          <input
            type="text"
            value={initial.usuario}
            readOnly
            style={{ background: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.5)' }}
          />
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <div className="adm-field" style={{ flex: 1 }}>
          <label>Nombre</label>
          <input
            type="text"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            placeholder="Ej: Juan"
          />
        </div>
        <div className="adm-field" style={{ flex: 1 }}>
          <label>Apellido</label>
          <input
            type="text"
            value={form.apellido}
            onChange={(e) => setForm({ ...form, apellido: e.target.value })}
            placeholder="Ej: Pérez"
          />
        </div>
      </div>

      <div className="adm-field">
        <label>Email</label>
        <input
          type="email"
          value={form.mail}
          onChange={(e) => setForm({ ...form, mail: e.target.value })}
          placeholder="usuario@zeroohms.com.ar"
        />
      </div>

      <div className="adm-field">
        <label>{isEditing ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña'}</label>
        <input
          type="password"
          value={form.clave}
          onChange={(e) => setForm({ ...form, clave: e.target.value })}
          placeholder={isEditing ? '••••••••' : 'Mínimo 6 caracteres'}
          minLength={isEditing ? 0 : 6}
        />
      </div>

      {error && <p className="adm-error" role="alert">{error}</p>}

      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose}>
          Cancelar
        </button>
        <button type="submit" className="adm-btn adm-btn--primary" disabled={saving}>
          {saving ? 'Guardando…' : (isEditing ? 'Actualizar' : 'Crear')}
        </button>
      </div>
    </form>
  )
}