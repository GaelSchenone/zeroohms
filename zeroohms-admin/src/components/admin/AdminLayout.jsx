import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import gsap from 'gsap'
import { getMe, logout } from '../../api/auth.js'
import { nombreCompleto, iniciales } from '../../utils/format.js'
import {
  Home, Inbox, Users, SettingsCog2, ClipboardNote, Settings2, Logout, Search, MoreVertical,
} from 'pixelarticons/react'
import './AdminLayout.css'

// Accesos directos del bottom tab bar en mobile (subset de NAV_GROUPS).
const TABBAR_MAIN = [
  { label: 'Resumen', icon: Home, to: '/' },
  { label: 'Tickets', icon: Inbox, to: '/tickets' },
  { label: 'Clientes', icon: Users, to: '/clientes' },
  { label: 'Tareas', icon: SettingsCog2, to: '/tareas' },
]

// El resto de las secciones vive en el panel "Más" del bottom tab bar.
const TABBAR_MORE = [
  { label: 'Presupuestos', icon: Settings2, to: '/presupuestos' },
  { label: 'Checklists', icon: ClipboardNote, to: '/checklists' },
  { label: 'Usuarios', icon: Users, to: '/usuarios', adminOnly: true },
  { label: 'Ajustes', icon: SettingsCog2, to: '/ajustes' },
]

const NAV_GROUPS = [
  {
    label: 'General',
    items: [
      { label: 'Resumen', icon: Home, to: '/' },
    ],
  },
  {
    label: 'Operaciones',
    items: [
      { label: 'Tickets', icon: Inbox, to: '/tickets' },
      { label: 'Tareas', icon: SettingsCog2, to: '/tareas' },
      { label: 'Presupuestos', icon: Settings2, to: '/presupuestos' },
      { label: 'Checklists', icon: ClipboardNote, to: '/checklists' },
    ],
  },
  {
    label: 'Contactos',
    items: [
      { label: 'Clientes', icon: Users, to: '/clientes' },
      { label: 'Usuarios', icon: Users, to: '/usuarios', adminOnly: true },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { label: 'Ajustes', icon: Settings2, to: '/ajustes' },
    ],
  },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false)
  const [sheetMounted, setSheetMounted] = useState(false)
  const backdropRef = useRef(null)
  const sheetRef = useRef(null)

  useEffect(() => {
    getMe().then(setUser).catch(() => logout())
  }, [])

  useEffect(() => {
    setMobileMoreOpen(false)
  }, [location.pathname])

  const isNavActive = (to) => (to === '/' ? location.pathname === '/' : location.pathname.startsWith(to))

  const moreItems = TABBAR_MORE.filter((item) => !item.adminOnly || user?.usuario === 'admin')
  const isMoreActive = mobileMoreOpen || moreItems.some((item) => isNavActive(item.to))

  const openMoreSheet = () => {
    setSheetMounted(true)
    setMobileMoreOpen(true)
  }

  const closeMoreSheet = () => setMobileMoreOpen(false)

  // Anima la apertura/cierre del panel "Más" y sus items con GSAP; el cierre
  // recién desmonta el sheet cuando la animación de salida termina.
  useLayoutEffect(() => {
    if (!sheetMounted || !sheetRef.current || !backdropRef.current) return undefined

    const items = gsap.utils.toArray(sheetRef.current.querySelectorAll('.adm-sheet-item, .adm-sheet-logout'))
    const tl = gsap.timeline()

    if (mobileMoreOpen) {
      tl.fromTo(backdropRef.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25, ease: 'power1.out' }, 0)
        .fromTo(sheetRef.current, { yPercent: 100, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.45, ease: 'back.out(1.7)' }, 0)
        .fromTo(items, { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.35, stagger: 0.06, ease: 'power2.out' }, 0.15)
    } else {
      tl.to(items, { y: 12, autoAlpha: 0, duration: 0.15, stagger: 0.03, ease: 'power1.in' }, 0)
        .to(sheetRef.current, { yPercent: 100, autoAlpha: 0, duration: 0.3, ease: 'power2.in' }, 0.05)
        .to(backdropRef.current, { autoAlpha: 0, duration: 0.25 }, 0.05)
        .call(() => setSheetMounted(false))
    }

    return () => tl.kill()
  }, [mobileMoreOpen, sheetMounted])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/tickets?search=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
    }
  }

  const displayName = user ? nombreCompleto(user) : ''
  const initials = user ? iniciales(displayName) : '?'

  return (
    <div className="adm">
      <aside className="adm-sidebar">
        <img className="adm-logo" src="/logos/imagotipo.svg" alt="Zero Ohms" />
        <nav className="adm-nav">
          {NAV_GROUPS.map((group) => (
            <div className="adm-nav-group" key={group.label}>
              <span className="adm-nav-group-label">{group.label}</span>
              {group.items.filter((item) => !item.adminOnly || user?.usuario === 'admin').map((item) => {
                const Icon = item.icon
                const isActive = isNavActive(item.to)
                return (
                  <NavLink
                    key={item.label}
                    to={item.to}
                    className={`adm-nav-item${isActive ? ' is-active' : ''}`}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </NavLink>
                )
              })}
            </div>
          ))}
        </nav>
        <button className="adm-logout" onClick={handleLogout}>
          <Logout size={20} />
          <span>Cerrar sesión</span>
        </button>
      </aside>

      <main className="adm-main">
        <header className="adm-topbar">
          <form className="adm-search" onSubmit={handleSearch}>
            <Search size={18} />
            <input
              type="text"
              placeholder="Buscar ticket, cliente, DNI, N° de serie…"
              aria-label="Buscar tickets, clientes y equipos"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button type="button" className="adm-search-clear" aria-label="Limpiar búsqueda" onClick={() => setSearchQuery('')}>
                ×
              </button>
            )}
          </form>
          <div className="adm-user">
            <div className="adm-user-text">
              <strong>{displayName || '...'}</strong>
              <span>{user?.mail || ''}</span>
            </div>
            <span className="adm-user-avatar">{initials}</span>
          </div>
        </header>

        <div className="adm-content">
          <Outlet context={{ user }} />
        </div>

        <nav className="adm-tabbar">
          {TABBAR_MAIN.map((item) => {
            const Icon = item.icon
            const isActive = isNavActive(item.to)
            return (
              <NavLink key={item.label} to={item.to} className={`adm-tabbar-item${isActive ? ' is-active' : ''}`}>
                <span className="adm-tab-icon-wrap"><Icon size={20} /></span>
                <span>{item.label}</span>
              </NavLink>
            )
          })}
          <button
            type="button"
            className={`adm-tabbar-item${isMoreActive ? ' is-active' : ''}`}
            onClick={() => (mobileMoreOpen ? closeMoreSheet() : openMoreSheet())}
          >
            <span className="adm-tab-icon-wrap"><MoreVertical size={20} /></span>
            <span>Más</span>
          </button>
        </nav>
      </main>

      {sheetMounted && (
        <>
          <div ref={backdropRef} className="adm-sheet-backdrop" onClick={closeMoreSheet} />
          <div ref={sheetRef} className="adm-sheet">
            <div className="adm-sheet-handle" />
            <div className="adm-sheet-head">
              <span className="adm-sheet-title">Más opciones</span>
              <button type="button" className="adm-sheet-close" aria-label="Cerrar" onClick={closeMoreSheet}>
                ×
              </button>
            </div>
            <div className="adm-sheet-grid">
              {moreItems.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink key={item.label} to={item.to} className="adm-sheet-item">
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </NavLink>
                )
              })}
            </div>
            <button type="button" className="adm-sheet-logout" onClick={handleLogout}>
              <Logout size={18} />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
