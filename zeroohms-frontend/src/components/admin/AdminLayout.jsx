import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { getMe, logout } from '../../api/auth.js'
import {
  Home, Inbox, Users, SettingsCog2, ClipboardNote, Settings2, Logout, Search,
} from 'pixelarticons/react'
import './AdminLayout.css'

const NAV_GROUPS = [
  {
    label: 'General',
    items: [
      { label: 'Resumen', icon: Home, to: '/admin' },
    ],
  },
  {
    label: 'Operaciones',
    items: [
      { label: 'Tickets', icon: Inbox, to: '/admin/tickets' },
      { label: 'Tareas', icon: SettingsCog2, to: '/admin/tareas' },
      { label: 'Presupuestos', icon: Settings2, to: '/admin/presupuestos' },
      { label: 'Checklists', icon: ClipboardNote, to: '/admin/checklists' },
    ],
  },
  {
    label: 'Contactos',
    items: [
      { label: 'Clientes', icon: Users, to: '/admin/clientes' },
      { label: 'Usuarios', icon: Users, to: '/admin/usuarios' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { label: 'Ajustes', icon: Settings2, to: '/admin/ajustes' },
    ],
  },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    getMe().then(setUser).catch(() => logout())
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/admin/tickets?search=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
    }
  }

  const initials = user
    ? `${user.usuario[0]}`.toUpperCase()
    : '?'

  return (
    <div className="adm">
      <aside className="adm-sidebar">
        <img className="adm-logo" src="/logos/imagotipo.svg" alt="Zero Ohms" />
        <nav className="adm-nav">
          {NAV_GROUPS.map((group) => (
            <div className="adm-nav-group" key={group.label}>
              <span className="adm-nav-group-label">{group.label}</span>
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = item.to === '/admin'
                  ? location.pathname === '/admin'
                  : location.pathname.startsWith(item.to)
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
              placeholder="Buscar ticket, cliente…"
              aria-label="Buscar tickets y clientes"
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
            <span className="adm-user-avatar">{initials}</span>
            <div className="adm-user-text">
              <strong>{user?.usuario || '...'}</strong>
              <span>{user?.mail || ''}</span>
            </div>
          </div>
        </header>

        <div className="adm-content">
          <Outlet context={{ user }} />
        </div>
      </main>
    </div>
  )
}
