import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'pixelarticons/react'
import './Combobox.css'

export default function Combobox({
  value,
  onChange,
  options,
  placeholder = 'Elegir…',
  className = '',
  autoOpen = false,
  disabled = false,
  onClose,
}) {
  const [open, setOpen] = useState(autoOpen)
  const ref = useRef(null)

  const cerrar = () => {
    setOpen(false)
    onClose?.()
  }

  useEffect(() => {
    if (!open) return
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) cerrar()
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const selected = options.find((o) => String(o.value) === String(value))

  return (
    <div className={`cbx ${className}`} ref={ref}>
      <button
        type="button"
        className={`cbx-trigger${open ? ' is-open' : ''}`}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
        disabled={disabled}
      >
        <span className={selected ? 'cbx-value' : 'cbx-placeholder'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      {open && (
        <div className="cbx-menu" role="listbox" onClick={(e) => e.stopPropagation()}>
          {options.map((o) => (
            <button
              type="button"
              key={o.value}
              role="option"
              aria-selected={String(o.value) === String(value)}
              className={String(o.value) === String(value) ? 'is-selected' : ''}
              onClick={() => { onChange(o.value); cerrar() }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
