import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'

// Entrada/salida animada para un par backdrop+card montado condicionalmente
// por el padre ({cond && <Modal onClose={...} />}). Como React desmontaría el
// componente al toque si el padre simplemente cambia `cond`, acá se expone
// `requestClose()`: reproduce la animación de salida y recién al terminar
// llama al `onClose` real que le pasó el padre.
export default function useModalTransition(onClose) {
  const backdropRef = useRef(null)
  const modalRef = useRef(null)
  const closingRef = useRef(false)

  useLayoutEffect(() => {
    if (!backdropRef.current || !modalRef.current) return undefined
    const tl = gsap.timeline()
    tl.fromTo(backdropRef.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, ease: 'power1.out' }, 0)
      .fromTo(
        modalRef.current,
        { y: 24, autoAlpha: 0, scale: 0.97 },
        { y: 0, autoAlpha: 1, scale: 1, duration: 0.35, ease: 'back.out(1.6)' },
        0,
      )
    return () => tl.kill()
  }, [])

  const requestClose = () => {
    if (closingRef.current) return
    closingRef.current = true
    gsap.timeline({ onComplete: onClose })
      .to(modalRef.current, { y: 16, autoAlpha: 0, scale: 0.97, duration: 0.22, ease: 'power2.in' }, 0)
      .to(backdropRef.current, { autoAlpha: 0, duration: 0.2 }, 0.03)
  }

  return { backdropRef, modalRef, requestClose }
}
