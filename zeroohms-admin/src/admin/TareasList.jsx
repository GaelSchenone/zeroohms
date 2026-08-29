import { useEffect, useState } from 'react'
import { api } from '../api/client.js'
import TareaKanban from '../components/tickets/TareaKanban.jsx'

export default function TareasList() {
  const [filterTkId, setFilterTkId] = useState('')
  const [usuarios, setUsuarios] = useState([])
  const [activeTab, setActiveTab] = useState('todas')

  useEffect(() => {
    let activo = true
    api('/usuarios?per_page=100')
      .then((us) => {
        if (activo) setUsuarios(us)
      })
      .catch(() => setUsuarios([]))
    return () => {
      activo = false
    }
  }, [])

  const usuarioFiltro = activeTab !== 'todas' && activeTab !== 'sin_asignar' ? activeTab : null
  const sinAsignarFiltro = activeTab === 'sin_asignar'

  return (
    <div>
      <div className="adm-tabs">
        <button
          type="button"
          className={`adm-tab${activeTab === 'todas' ? ' is-active' : ''}`}
          onClick={() => setActiveTab('todas')}
        >
          Todas
        </button>
        <button
          type="button"
          className={`adm-tab${activeTab === 'sin_asignar' ? ' is-active' : ''}`}
          onClick={() => setActiveTab('sin_asignar')}
        >
          Sin asignar
        </button>
        {usuarios.map((u) => (
          <button
            type="button"
            key={u.usuario}
            className={`adm-tab${activeTab === u.usuario ? ' is-active' : ''}`}
            onClick={() => setActiveTab(u.usuario)}
          >
            {u.usuario}
          </button>
        ))}
      </div>

      <TareaKanban
        tkid={Number(filterTkId) || null}
        usuario={usuarioFiltro}
        sinAsignar={sinAsignarFiltro}
        showTicketBadge
        title="Tareas"
        actions={
          <input
            type="text"
            className="adm-search-input"
            placeholder="Filtrar por ticket ID…"
            value={filterTkId}
            onChange={(e) => setFilterTkId(e.target.value)}
          />
        }
      />
    </div>
  )
}
