import { useEffect } from 'react'
import useFotoBlob from './useFotoBlob.js'
import './FotoLightbox.css'

export default function FotoLightbox({ fotos, index, onClose, onIndexChange, onBorrar }) {
  const foto = fotos[index]
  const url = useFotoBlob(foto.fotoid, 'full')

  const anterior = () => onIndexChange((index - 1 + fotos.length) % fotos.length)
  const siguiente = () => onIndexChange((index + 1) % fotos.length)

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') anterior()
      if (e.key === 'ArrowRight') siguiente()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, fotos.length])

  return (
    <div className="flb-backdrop" role="dialog" aria-modal="true" aria-label="Ver foto" onClick={onClose}>
      <div className="flb-box" onClick={(e) => e.stopPropagation()}>
        <div className="flb-head">
          <span>{foto.nombre || `Foto #${foto.fotoid}`}</span>
          <button type="button" className="flb-close" aria-label="Cerrar" onClick={onClose}>×</button>
        </div>
        <div className="flb-body">
          {fotos.length > 1 && (
            <button type="button" className="flb-nav flb-nav--prev" aria-label="Anterior" onClick={anterior}>‹</button>
          )}
          {url ? <img src={url} alt={foto.nombre || 'foto'} /> : <div className="adm-loading">Cargando…</div>}
          {fotos.length > 1 && (
            <button type="button" className="flb-nav flb-nav--next" aria-label="Siguiente" onClick={siguiente}>›</button>
          )}
        </div>
        <div className="flb-foot">
          <span className="flb-count">{index + 1} / {fotos.length}</span>
          <button
            type="button"
            className="adm-btn adm-btn--ghost"
            style={{ color: '#f87171', borderColor: 'rgba(239,68,68,0.4)' }}
            onClick={() => onBorrar(foto.fotoid)}
          >
            Eliminar foto
          </button>
        </div>
      </div>
    </div>
  )
}
