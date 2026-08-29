import { useEffect, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import useFotoBlob from './useFotoBlob.js'
import useModalTransition from '../../hooks/useModalTransition.js'
import './FotoLightbox.css'

export default function FotoLightbox({ fotos, index, onClose, onIndexChange, onBorrar }) {
  const foto = fotos[index]
  const url = useFotoBlob(foto.fotoid, 'full')
  const { backdropRef, modalRef, requestClose } = useModalTransition(onClose)
  const imageWrapRef = useRef(null)

  const anterior = () => onIndexChange((index - 1 + fotos.length) % fotos.length)
  const siguiente = () => onIndexChange((index + 1) % fotos.length)

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') requestClose()
      if (e.key === 'ArrowLeft') anterior()
      if (e.key === 'ArrowRight') siguiente()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, fotos.length])

  // Pop sutil cada vez que cambia la foto mostrada (anterior/siguiente).
  useLayoutEffect(() => {
    if (!imageWrapRef.current) return undefined
    const tween = gsap.fromTo(
      imageWrapRef.current,
      { autoAlpha: 0, scale: 0.96 },
      { autoAlpha: 1, scale: 1, duration: 0.25, ease: 'power2.out' },
    )
    return () => tween.kill()
  }, [url])

  return (
    <div ref={backdropRef} className="flb-backdrop" role="dialog" aria-modal="true" aria-label="Ver foto" onClick={requestClose}>
      <div ref={modalRef} className="flb-box" onClick={(e) => e.stopPropagation()}>
        <div className="flb-head">
          <span>{foto.nombre || `Foto #${foto.fotoid}`}</span>
          <button type="button" className="flb-close" aria-label="Cerrar" onClick={requestClose}>×</button>
        </div>
        <div className="flb-body">
          {fotos.length > 1 && (
            <button type="button" className="flb-nav flb-nav--prev" aria-label="Anterior" onClick={anterior}>‹</button>
          )}
          <div ref={imageWrapRef} className="flb-image-wrap">
            {url ? <img src={url} alt={foto.nombre || 'foto'} /> : <div className="adm-loading">Cargando…</div>}
          </div>
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
            onClick={() => Promise.resolve(onBorrar(foto.fotoid)).then((borrada) => borrada && requestClose())}
          >
            Eliminar foto
          </button>
        </div>
      </div>
    </div>
  )
}
