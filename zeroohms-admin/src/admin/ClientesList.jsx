import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client.js'
import { Plus } from 'pixelarticons/react'

export default function ClientesList() {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const params = new URLSearchParams({ page, per_page: 20 })
    if (query) params.set('search', query)
    api(`/clientes?${params}`)
      .then(setClientes)
      .catch(() => setClientes([]))
      .finally(() => setLoading(false))
  }, [page, query])

  return (
    <div className="adm-panel">
      <div className="adm-panel-head">
        <h2>Clientes</h2>
        <Link to="/clientes/nuevo" className="adm-btn adm-btn--primary">
          <Plus size={16} /> Nuevo cliente
        </Link>
      </div>

      <input
        type="text"
        className="adm-search-input"
        placeholder="Buscar por nombre, DNI, teléfono o email…"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setPage(1) }}
      />

      {loading ? (
        <div className="adm-loading">Cargando clientes…</div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>DNI</th>
                <th>Nombre</th>
                <th>Apellido</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => (
                <tr key={c.dni}>
                  <td className="adm-td-id">{c.dni}</td>
                  <td>{c.nombre || '—'}</td>
                  <td>{c.apellido || '—'}</td>
                  <td>{c.email || '—'}</td>
                  <td>{c.telefono || '—'}</td>
                  <td>
                    <Link to={`/clientes/${c.dni}`} className="adm-btn adm-btn--ghost">
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
              {clientes.length === 0 && (
                <tr>
                  <td colSpan="6" className="adm-empty">No hay clientes que coincidan.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
        <button className="adm-btn adm-btn--ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Anterior
        </button>
        <span style={{ alignSelf: 'center', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
          Página {page}
        </span>
        <button className="adm-btn adm-btn--ghost" disabled={clientes.length < 20} onClick={() => setPage((p) => p + 1)}>
          Siguiente
        </button>
      </div>
    </div>
  )
}
