import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, verifyOtp } from '../api/auth.js'
import './Login.css'

export default function Login() {
  const navigate = useNavigate()
  const [usuario, setUsuario] = useState('')
  const [clave, setClave] = useState('')
  const [codigo, setCodigo] = useState('')
  const [recordar, setRecordar] = useState(false)
  const [paso, setPaso] = useState('credenciales')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(usuario, clave)
      setCodigo('')
      setPaso('otp')
    } catch (err) {
      setError(err.message || 'Usuario o contraseña incorrectos.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await verifyOtp(usuario, codigo, recordar)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Código inválido.')
    } finally {
      setLoading(false)
    }
  }

  const reenviarCodigo = async () => {
    setError('')
    setLoading(true)
    try {
      await login(usuario, clave)
      setCodigo('')
    } catch (err) {
      setError(err.message || 'No se pudo reenviar el código.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <img className="login-logo" src="/logos/imagotipo.svg" alt="Zero Ohms" />
        <h1 className="login-title">Panel de administración</h1>
        {paso === 'credenciales' ? (
          <>
            <p className="login-subtitle">Ingresá con tus credenciales para gestionar los tickets.</p>

            <form className="login-form" onSubmit={handleLogin}>
              <label className="login-field">
                <span>Usuario</span>
                <input
                  type="text"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  placeholder="admin"
                  autoComplete="username"
                />
              </label>

              <label className="login-field">
                <span>Contraseña</span>
                <input
                  type="password"
                  value={clave}
                  onChange={(e) => setClave(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </label>

              <label className="login-remember">
                <input
                  type="checkbox"
                  checked={recordar}
                  onChange={(e) => setRecordar(e.target.checked)}
                />
                <span>Recordarme en este dispositivo</span>
              </label>

              {error && <p className="login-error">{error}</p>}

              <button className="login-submit" type="submit" disabled={loading}>
                {loading ? 'Ingresando…' : 'Ingresar'}
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="login-subtitle">Te mandamos un código a tu mail. Ingresalo para continuar.</p>

            <form className="login-form" onSubmit={handleVerify}>
              <label className="login-field">
                <span>Código</span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  autoComplete="one-time-code"
                  autoFocus
                />
              </label>

              {error && <p className="login-error">{error}</p>}

              <button className="login-submit" type="submit" disabled={loading || codigo.length !== 6}>
                {loading ? 'Verificando…' : 'Verificar'}
              </button>
              <button
                type="button"
                className="login-resend"
                onClick={reenviarCodigo}
                disabled={loading}
              >
                Reenviar código
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
