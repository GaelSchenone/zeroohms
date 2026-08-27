import { useState, useEffect, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { crearSesionSubida, listarFotos } from '../../api/fotos.js'
import './QrSubidaModal.css'

const INTERVALO_POLLING = 2500

export default function QrSubidaModal({ tkid, onClose, onFotosNuevas }) {
  const [sesion, setSesion] = useState(null)
  const [error, setError] = useState('')
  const [segundosRestantes, setSegundosRestantes] = useState(0)
  const [nuevasDetectadas, setNuevasDetectadas] = useState(0)
  const cantidadInicialRef = useRef(null)

  const esLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname)

  const generarSesion = () => {
    setError('')
    setSesion(null)
    setNuevasDetectadas(0)
    cantidadInicialRef.current = null
    crearSesionSubida(tkid)
      .then(setSesion)
      .catch((err) => setError(err.message))
  }

  useEffect(() => {
    generarSesion()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tkid])

  useEffect(() => {
    if (!sesion) return
    const expiraEn = new Date(sesion.expira_en).getTime()
    const actualizar = () => setSegundosRestantes(Math.max(0, Math.round((expiraEn - Date.now()) / 1000)))
    actualizar()
    const id = setInterval(actualizar, 1000)
    return () => clearInterval(id)
  }, [sesion])

  useEffect(() => {
    if (!sesion) return
    let cancelado = false
    const expiraEn = new Date(sesion.expira_en).getTime()
    let id

    const poll = async () => {
      if (cancelado) return
      if (Date.now() > expiraEn) {
        clearInterval(id)
        return
      }
      if (document.hidden) return
      try {
        const fotos = await listarFotos(tkid)
        if (cancelado) return
        if (cantidadInicialRef.current === null) {
          cantidadInicialRef.current = fotos.length
        } else if (fotos.length > cantidadInicialRef.current) {
          setNuevasDetectadas((n) => n + (fotos.length - cantidadInicialRef.current))
          cantidadInicialRef.current = fotos.length
          onFotosNuevas?.()
        }
      } catch {
        // un fallo puntual de polling no debe cerrar el modal
      }
    }

    poll()
    id = setInterval(poll, INTERVALO_POLLING)
    return () => {
      cancelado = true
      clearInterval(id)
    }
  }, [sesion, tkid, onFotosNuevas])

  const url = sesion ? `${window.location.origin}/subir-fotos#t=${sesion.token}` : ''
  const vencido = sesion && segundosRestantes <= 0
  const mm = String(Math.floor(segundosRestantes / 60)).padStart(2, '0')
  const ss = String(segundosRestantes % 60).padStart(2, '0')

  return (
    <div className="qsm-backdrop" role="dialog" aria-modal="true" aria-label="Subir fotos desde el celular" onClick={onClose}>
      <div className="qsm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="qsm-head">
          <h2>Subir fotos desde el celular</h2>
          <button type="button" className="qsm-close" aria-label="Cerrar" onClick={onClose}>×</button>
        </div>

        <div className="qsm-body">
          {esLocalhost && (
            <div className="qsm-warning">
              Estás en <code>localhost</code>: el celular no va a poder conectarse a esta dirección.
              Entrá al panel usando la IP de tu red local para que el QR funcione.
            </div>
          )}

          {error && <p className="adm-error" role="alert">{error}</p>}

          {sesion && !vencido && (
            <>
              <div className="qsm-qr-wrap">
                <QRCodeSVG value={url} size={220} bgColor="#ffffff" fgColor="#0d0d0d" />
              </div>
              <p className="qsm-hint">Escaneá este código con la cámara del celular.</p>
              <p className="qsm-countdown">Vence en {mm}:{ss}</p>
              {nuevasDetectadas > 0 && (
                <p className="qsm-nuevas">
                  {nuevasDetectadas} foto{nuevasDetectadas === 1 ? '' : 's'} nueva{nuevasDetectadas === 1 ? '' : 's'} recibida{nuevasDetectadas === 1 ? '' : 's'}
                </p>
              )}
            </>
          )}

          {vencido && (
            <div className="qsm-vencido">
              <p>El código venció.</p>
              <button type="button" className="adm-btn adm-btn--subtle" onClick={generarSesion}>
                Generar uno nuevo
              </button>
            </div>
          )}
        </div>

        <div className="qsm-foot">
          <button type="button" className="adm-btn adm-btn--primary" onClick={onClose}>Listo</button>
        </div>
      </div>
    </div>
  )
}
