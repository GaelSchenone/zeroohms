import { useState, useEffect } from 'react'
import { api } from '../api/client.js'
import { Plus, SettingsCog2 } from 'pixelarticons/react'
import UsuariosForm from './UsuariosForm.jsx'

export default function UsuariosList() {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)

  const fetchUsuarios = () => {
    setLoading(true)
    api('/usuarios?per_page=100')
      .then(setUsuarios)
      .catch(() => setUsuarios([]))
      .finally(() => setLoading(false))
  }

  useEffect(fetchUsuarios, [])

  const handleDelete = async (usuario) => {
    if (!window.confirm(`¿Eliminar al usuario ${usuario}?`)) return
    try {
      await api(`/usuarios/${usuario}`, { method: 'DELETE' })
      setUsuarios((prev) => prev.filter((u) => u.usuario !== usuario))
    } catch (err) {
      window.alert('Error: ' + err.message)
    }
  }

  const handleEdit = (user) => {
    setEditing(user)
    setShowForm(true)
  }

  const handleCreate = () => {
    setEditing(null)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditing(null)
  }

  const handleSaved = () => {
    fetchUsuarios()
    handleCloseForm()
  }

  return (
    <div className="adm-panel">
      <div className="adm-panel-head">
        <h2>Usuarios</h2>
        <button className="adm-btn adm-btn--primary" onClick={handleCreate}>
          <Plus size={16} /> Nuevo usuario
        </button>
      </div>

      {showForm && (
        <UsuariosForm
          initial={editing}
          onClose={handleCloseForm}
          onSaved={handleSaved}
        />
      )}

      {loading ? (
        <div className="adm-loading">Cargando usuarios…</div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Email</th>
                <th>Fecha creación</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.usuario}>
                  <td className="adm-td-id">{u.usuario}</td>
                  <td>{u.mail || '—'}</td>
                  <td>
                    {u.fechacreacion ? new Date(u.fechacreacion).toLocaleDateString('es-AR') : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button
                        className="adm-btn adm-btn--ghost"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                        onClick={() => handleEdit(u)}
                      >
                        <SettingsCog2 size={14} />
                      </button>
                      <button
                        className="adm-btn adm-btn--ghost"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', color: '#f87171', borderColor: 'rgba(239,68,68,0.4)' }}
                        onClick={() => handleDelete(u.usuario)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {usuarios.length === 0 && (
                <tr>
                  <td colSpan="4" className="adm-empty">No hay usuarios.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}