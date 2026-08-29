import { useState } from 'react'
import { Menu, Close } from 'pixelarticons/react'
import './Header.css'

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header id="top" className="homepage-header">
        <div className="logo">
          <img src="/logos/imagotipo.svg" alt="Imagotipo" />
        </div>

        <button
          type="button"
          className="nav-toggle"
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <Close width={22} height={22} /> : <Menu width={22} height={22} />}
        </button>

        <div className={`nav${menuOpen ? ' nav--open' : ''}`}>
            <a href="#servicios" onClick={() => setMenuOpen(false)}>Servicios</a>
            <a href="#reparaciones" onClick={() => setMenuOpen(false)}>Reparaciones</a>
            <a href="#nosotros" onClick={() => setMenuOpen(false)}>Nosotros</a>
            <a href="#contacto" onClick={() => setMenuOpen(false)}>Contacto</a>
        </div>

    </header>
  );
}
