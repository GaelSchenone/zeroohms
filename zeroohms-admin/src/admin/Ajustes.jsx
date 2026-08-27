import { useState, useEffect } from 'react'
import { getMe } from '../api/auth.js'

export default function Ajustes() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="adm-loading">Cargando…</div>

  return (
    <div className="adm-panel" style={{ maxWidth: '500px' }}>
      <h2>Ajustes</h2>

      <div className="adm-detail-grid">
        <div className="adm-detail-item">
          <span className="adm-detail-label">Usuario</span>
          <span className="adm-detail-value">{user?.usuario || '—'}</span>
        </div>
        <div className="adm-detail-item">
          <span className="adm-detail-label">Email</span>
          <span className="adm-detail-value">{user?.mail || '—'}</span>
        </div>
      </div>

      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginTop: '1rem' }}>
        Próximamente: cambiar contraseña y configuración de notificaciones.
      </p>
    </div>
  )
}
