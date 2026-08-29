import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'

// Anima en cascada los hijos directos de un contenedor cada vez que `dep`
// cambia (nueva página, nuevo resultado de búsqueda, refetch, etc).
// Devolvé el ref en el elemento contenedor (ej. <tbody ref={...}>).
export default function useStaggerReveal(dep, { selector = ':scope > *' } = {}) {
  const containerRef = useRef(null)

  useLayoutEffect(() => {
    if (!containerRef.current) return undefined
    const items = containerRef.current.querySelectorAll(selector)
    if (!items.length) return undefined

    const tween = gsap.fromTo(
      items,
      { autoAlpha: 0, y: 10 },
      { autoAlpha: 1, y: 0, duration: 0.3, stagger: 0.045, ease: 'power2.out' },
    )
    return () => tween.kill()
  }, [dep, selector])

  return containerRef
}
