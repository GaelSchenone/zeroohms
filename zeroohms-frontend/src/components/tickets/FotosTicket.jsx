import { useState, useEffect, useCallback, useRef } from 'react'
import { listarFotos, borrarFoto, subirFotosDesktop } from '../../api/fotos.js'
import useFotoBlob from './useFotoBlob.js'
import QrSubidaModal from './QrSubidaModal.jsx'
import FotoLightbox from './FotoLightbox.jsx'
import './FotosTicket.css'

export default function FotosTicket({ tkid }) {
  const [fotos, setFotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [subiendo, setSubiendo] = useState(false)
  const [progreso, setProgreso] = useState(0)
  const [errores, setErrores] = useState([])
  const [showQr, setShowQr] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  const fetchFotos = useCallback(() => {
    setLoading(true)
    listarFotos(tkid)
      .then(setFotos)
      .catch(() => setFotos([]))
      .finally(() => setLoading(false))
  }, [tkid])

  useEffect(() => { fetchFotos() }, [fetchFotos])

  const subirArchivos = async (fileList) => {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'))
    if (files.length === 0) return
    setSubiendo(true)
    setProgreso(0)
    setErrores([])
    try {
      const resultado = await subirFotosDesktop(tkid, files, setProgreso)
      if (resultado?.errores?.length) setErrores(resultado.errores)
      fetchFotos()
    } catch (err) {
      setErrores([{ motivo: err.message }])
    } finally {
      setSubiendo(false)
      setProgreso(0)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    subirArchivos(e.dataTransfer.files)
  }

  const handleBorrar = async (fotoid) => {
    if (!window.confirm('¿Eliminar esta foto?')) return
    await borrarFoto(fotoid)
    setFotos((prev) => prev.filter((f) => f.fotoid !== fotoid))
    setLightboxIndex(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div
        className={`fot-dropzone${dragOver ? ' is-drag' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <p className="fot-dropzone-text">Arrastrá fotos acá, o</p>
        <div className="fot-dropzone-actions">
          <button type="button" className="adm-btn adm-btn--subtle" onClick={() => inputRef.current?.click()} disabled={subiendo}>
            Elegir archivos
          </button>
          <button type="button" className="adm-btn adm-btn--primary" onClick={() => setShowQr(true)}>
            Subir desde el celular
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => { subirArchivos(e.target.files); e.target.value = '' }}
        />
        {subiendo && (
          <div className="fot-progress">
            <div className="fot-progress-bar" style={{ width: `${Math.round(progreso * 100)}%` }} />
          </div>
        )}
      </div>

      {errores.length > 0 && (
        <div className="fot-errores">
          {errores.map((e, i) => (
            <p key={i}>{e.nombre ? `${e.nombre}: ` : ''}{e.motivo}</p>
          ))}
        </div>
      )}

      {loading ? (
        <div className="adm-loading">Cargando fotos…</div>
      ) : fotos.length === 0 ? (
        <p className="adm-empty">Todavía no hay fotos en este ticket.</p>
      ) : (
        <div className="fot-grid">
          {fotos.map((f, idx) => (
            <FotoThumb key={f.fotoid} foto={f} onClick={() => setLightboxIndex(idx)} />
          ))}
        </div>
      )}

      {showQr && (
        <QrSubidaModal tkid={tkid} onClose={() => setShowQr(false)} onFotosNuevas={fetchFotos} />
      )}

      {lightboxIndex !== null && fotos[lightboxIndex] && (
        <FotoLightbox
          fotos={fotos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
          onBorrar={handleBorrar}
        />
      )}
    </div>
  )
}

function FotoThumb({ foto, onClick }) {
  const url = useFotoBlob(foto.fotoid, 'thumb')
  return (
    <button type="button" className="fot-thumb" onClick={onClick}>
      {url ? <img src={url} alt={foto.nombre || 'foto'} /> : <span className="fot-thumb-loading" />}
    </button>
  )
}
