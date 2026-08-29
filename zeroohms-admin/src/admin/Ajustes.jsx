import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { iniciarConexionGoogle, estadoConexionGoogle, desconectarGoogle } from '../api/google.js'

export default function Ajustes() {
  const { user } = useOutletContext() ?? {}
  const [google, setGoogle] = useState(null)
  const [loadingGoogle, setLoadingGoogle] = useState(true)
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    estadoConexionGoogle()
      .then(setGoogle)
      .catch(() => setGoogle({ conectado: false, valido: false }))
      .finally(() => setLoadingGoogle(false))

    const params = new URLSearchParams(window.location.search)
    const resultado = params.get('google')
    if (resultado === 'ok') setAviso('¡Cuenta de Google conectada!')
    if (resultado === 'error') setAviso('No se pudo conectar la cuenta de Google. Probá de nuevo.')
    if (resultado) window.history.replaceState(null, '', window.location.pathname)
  }, [])

  const conectar = async () => {
    setAviso('')
    try {
      await iniciarConexionGoogle()
    } catch (err) {
      setAviso(err.message || 'No se pudo iniciar la conexión con Google.')
    }
  }

  const desconectar = async () => {
    setAviso('')
    try {
      await desconectarGoogle()
      setGoogle({ conectado: false, valido: false })
    } catch (err) {
      setAviso(err.message || 'No se pudo desconectar la cuenta de Google.')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '500px' }}>
      <div className="adm-panel">
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

      <div className="adm-panel">
        <div className="adm-panel-head">
          <h2>Google Tasks</h2>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
          Conectá tu cuenta de Google para que las tareas que te asignen con fecha límite aparezcan como recordatorio en tu Google Tasks.
        </p>

        {aviso && <p style={{ fontSize: '0.85rem', color: '#ff8a74' }}>{aviso}</p>}

        {loadingGoogle ? (
          <div className="adm-loading">Cargando…</div>
        ) : google?.conectado && google?.valido ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <span className="adm-detail-value">Conectado como {google.google_email || '—'}</span>
            <button type="button" className="adm-btn adm-btn--ghost" onClick={desconectar}>
              Desconectar
            </button>
          </div>
        ) : (
          <div>
            {google?.conectado && !google?.valido && (
              <p style={{ fontSize: '0.85rem', color: '#f5c46a', marginBottom: '0.5rem' }}>
                La conexión con Google venció — volvé a conectarla.
              </p>
            )}
            <button type="button" className="adm-btn adm-btn--primary" onClick={conectar}>
              Conectar con Google
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
