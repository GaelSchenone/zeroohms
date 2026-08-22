import { useState, useEffect, useRef, useCallback } from 'react'
import { infoSesionMovil, subirFotosMovil } from '../api/fotos.js'
import { redimensionarImagen } from '../utils/imagen.js'
import './SubirFotosPage.css'

let idCounter = 0
const nextId = () => (idCounter += 1)

export default function SubirFotosPage() {
  const [token] = useState(() => {
    const hash = window.location.hash || ''
    const m = hash.match(/[#&]t=([^&]+)/)
    return m ? decodeURIComponent(m[1]) : ''
  })
  const [estado, setEstado] = useState('cargando') // cargando | ok | error
  const [errorMsg, setErrorMsg] = useState('')
  const [sesion, setSesion] = useState(null)
  const [cola, setCola] = useState([])
  const [subiendo, setSubiendo] = useState(false)

  const camaraRef = useRef(null)
  const galeriaRef = useRef(null)

  useEffect(() => {
    if (!token) {
      setEstado('error')
      setErrorMsg('Este enlace no tiene un código de subida válido.')
      return
    }
    infoSesionMovil(token)
      .then((data) => {
        setSesion(data)
        setEstado('ok')
      })
      .catch((err) => {
        setEstado('error')
        setErrorMsg(err.message)
      })
  }, [token])

  useEffect(() => {
    return () => {
      cola.forEach((item) => URL.revokeObjectURL(item.previewUrl))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const agregarArchivos = (fileList) => {
    const nuevos = Array.from(fileList || [])
      .filter((f) => f.type.startsWith('image/'))
      .map((file) => ({
        id: nextId(),
        file,
        previewUrl: URL.createObjectURL(file),
        status: 'pendiente',
        progreso: 0,
        motivo: '',
      }))
    if (nuevos.length) setCola((prev) => [...prev, ...nuevos])
  }

  const quitarItem = (id) => {
    setCola((prev) => {
      const item = prev.find((i) => i.id === id)
      if (item) URL.revokeObjectURL(item.previewUrl)
      return prev.filter((i) => i.id !== id)
    })
  }

  const actualizarItem = (id, cambios) => {
    setCola((prev) => prev.map((i) => (i.id === id ? { ...i, ...cambios } : i)))
  }

  const subirCola = useCallback(async () => {
    setSubiendo(true)
    const pendientes = cola.filter((i) => i.status === 'pendiente' || i.status === 'error')
    for (const item of pendientes) {
      actualizarItem(item.id, { status: 'subiendo', progreso: 0, motivo: '' })
      try {
        const archivo = await redimensionarImagen(item.file)
        const resultado = await subirFotosMovil(token, [archivo], (p) =>
          actualizarItem(item.id, { progreso: p }),
        )
        if (resultado?.errores?.length) {
          actualizarItem(item.id, { status: 'error', motivo: resultado.errores[0].motivo })
        } else {
          actualizarItem(item.id, { status: 'listo', progreso: 1 })
        }
      } catch (err) {
        actualizarItem(item.id, { status: 'error', motivo: err.message })
      }
    }
    setSubiendo(false)
  }, [cola, token])

  const pendientesCount = cola.filter((i) => i.status === 'pendiente' || i.status === 'error').length

  if (estado === 'cargando') {
    return (
      <div className="sfp-page">
        <div className="sfp-card"><p className="sfp-loading">Validando enlace…</p></div>
      </div>
    )
  }

  if (estado === 'error') {
    return (
      <div className="sfp-page">
        <div className="sfp-card">
          <h1 className="sfp-title">No se pudo abrir</h1>
          <p className="sfp-error">{errorMsg}</p>
          <p className="sfp-hint">Pedile al técnico que genere un nuevo código QR desde el ticket.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="sfp-page">
      <div className="sfp-card">
        <img className="sfp-logo" src="/logos/imagotipo.svg" alt="Zero Ohms" />
        <h1 className="sfp-title">Subir fotos del equipo</h1>
        <p className="sfp-subtitle">
          Ticket #{sesion.tkid}
          {sesion.codigoseguimiento ? ` · ${sesion.codigoseguimiento}` : ''}
          {(sesion.dispositivo_marca || sesion.dispositivo_modelo) && (
            <> · {[sesion.dispositivo_marca, sesion.dispositivo_modelo].filter(Boolean).join(' ')}</>
          )}
        </p>

        <div className="sfp-actions">
          <button type="button" className="sfp-btn sfp-btn--primary" onClick={() => camaraRef.current?.click()}>
            Sacar foto
          </button>
          <button type="button" className="sfp-btn" onClick={() => galeriaRef.current?.click()}>
            Elegir de la galería
          </button>
        </div>

        <input
          ref={camaraRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => { agregarArchivos(e.target.files); e.target.value = '' }}
        />
        <input
          ref={galeriaRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => { agregarArchivos(e.target.files); e.target.value = '' }}
        />

        {cola.length > 0 && (
          <div className="sfp-cola">
            {cola.map((item) => (
              <div key={item.id} className={`sfp-item sfp-item--${item.status}`}>
                <img src={item.previewUrl} alt="" />
                <div className="sfp-item-overlay">
                  {item.status === 'subiendo' && (
                    <div className="sfp-item-progress" style={{ height: `${Math.round(item.progreso * 100)}%` }} />
                  )}
                  {item.status === 'listo' && <span className="sfp-item-check">✓</span>}
                  {item.status === 'error' && <span className="sfp-item-err" title={item.motivo}>!</span>}
                </div>
                {item.status !== 'subiendo' && item.status !== 'listo' && (
                  <button type="button" className="sfp-item-remove" aria-label="Quitar" onClick={() => quitarItem(item.id)}>×</button>
                )}
              </div>
            ))}
          </div>
        )}

        {pendientesCount > 0 && (
          <button type="button" className="sfp-btn sfp-btn--primary sfp-btn--subir" onClick={subirCola} disabled={subiendo}>
            {subiendo ? 'Subiendo…' : `Subir ${pendientesCount} foto${pendientesCount === 1 ? '' : 's'}`}
          </button>
        )}

        <p className="sfp-hint">Ya se subieron {sesion.fotos_actuales + cola.filter((i) => i.status === 'listo').length} fotos a este ticket.</p>
      </div>
    </div>
  )
}
