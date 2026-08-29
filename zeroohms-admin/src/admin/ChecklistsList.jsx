import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client.js'
import { Plus } from 'pixelarticons/react'
import useStaggerReveal from '../hooks/useStaggerReveal.js'

export default function ChecklistsList() {
  const [checklists, setChecklists] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(null)
  const tbodyRef = useStaggerReveal(checklists)

  const fetchChecklists = () => {
    api('/checklists')
      .then(setChecklists)
      .catch(() => setChecklists([]))
      .finally(() => setLoading(false))
  }

  useEffect(fetchChecklists, [])

  const handleDelete = async (checklistid) => {
    if (!window.confirm('¿Eliminar esta checklist y todas sus preguntas?')) return
    setDeleting(checklistid)
    try {
      await api(`/checklists/${checklistid}`, { method: 'DELETE' })
      setChecklists((prev) => prev.filter((c) => c.checklistid !== checklistid))
    } finally {
      setDeleting(null)
    }
  }

  if (loading) return <div className="adm-loading">Cargando checklists…</div>

  return (
    <div className="adm-panel">
      <div className="adm-panel-head">
        <h2>Checklists</h2>
        <Link to="/checklists/nueva" className="adm-btn adm-btn--primary">
          <Plus size={16} /> Nueva checklist
        </Link>
      </div>

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Descripción</th>
              <th></th>
            </tr>
          </thead>
          <tbody ref={tbodyRef}>
            {checklists.map((c) => (
              <tr key={c.checklistid}>
                <td className="adm-td-id">#{c.checklistid}</td>
                <td>{c.nombre}</td>
                <td>{c.descripcion || '—'}</td>
                <td style={{ display: 'flex', gap: '0.35rem' }}>
                  <Link to={`/checklists/${c.checklistid}`} className="adm-btn adm-btn--ghost" style={{ fontSize: '0.8rem' }}>
                    Ver / Editar
                  </Link>
                  <button
                    className="adm-btn adm-btn--ghost"
                    style={{ fontSize: '0.8rem', color: '#f87171', borderColor: 'rgba(239,68,68,0.4)' }}
                    disabled={deleting === c.checklistid}
                    onClick={() => handleDelete(c.checklistid)}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {checklists.length === 0 && (
              <tr>
                <td colSpan="4" className="adm-empty">No hay checklists. Creá una para empezar.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
