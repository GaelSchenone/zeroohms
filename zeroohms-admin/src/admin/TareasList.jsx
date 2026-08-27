import { useState } from 'react'
import TareaKanban from '../components/tickets/TareaKanban.jsx'

export default function TareasList() {
  const [filterTkId, setFilterTkId] = useState('')

  return (
    <TareaKanban
      tkid={Number(filterTkId) || null}
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
  )
}
