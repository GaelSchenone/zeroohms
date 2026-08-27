import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client.js'

export default function ChecklistEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [preguntas, setPreguntas] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [newPregunta, setNewPregunta] = useState('')
  const [newRespuestas, setNewRespuestas] = useState(['', ''])
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    Promise.all([
      api('/checklists'),
      api(`/checklists/${id}/preguntas`),
    ])
      .then(([lists, preg]) => {
        const cl = lists.find((c) => String(c.checklistid) === String(id))
        if (cl) { setNombre(cl.nombre); setDescripcion(cl.descripcion || '') }
        setPreguntas(preg)
      })
      .catch(() => navigate('/checklists'))
      .finally(() => setLoading(false))
  }, [id, navigate])

  const handleSaveInfo = async () => {
    setSaving(true)
    setError('')
    try {
      await api(`/checklists/${id}`, {
        method: 'PUT',
        body: { nombre: nombre.trim(), descripcion: descripcion.trim() || null },
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePregunta = async (preguntaid) => {
    if (!window.confirm('¿Eliminar esta pregunta?')) return
    try {
      await api(`/checklists/${id}/preguntas/${preguntaid}`, { method: 'DELETE' })
      setPreguntas((prev) => prev.filter((p) => p.preguntaid !== preguntaid))
    } catch (err) {
      setError(err.message)
    }
  }

  const handleAddPregunta = async () => {
    if (!newPregunta.trim()) { setError('Escribí la pregunta.'); return }
    const validResp = newRespuestas.filter((r) => r.trim())
    if (validResp.length < 2) { setError('Necesitás al menos 2 respuestas.'); return }
    setAdding(true)
    setError('')
    try {
      const res = await api(`/checklists/${id}/preguntas`, {
        method: 'POST',
        body: {
          pregunta: newPregunta.trim(),
          respuestas: validResp.map((r) => ({ respuesta: r.trim() })),
        },
      })
      setPreguntas((prev) => [...prev, res])
      setNewPregunta('')
      setNewRespuestas(['', ''])
    } catch (err) {
      setError(err.message)
    } finally {
      setAdding(false)
    }
  }

  if (loading) return <div className="adm-loading">Cargando…</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '700px' }}>
      <div className="adm-panel">
        <div className="adm-panel-head">
          <h2>Editar checklist</h2>
          <button className="adm-btn adm-btn--primary" onClick={handleSaveInfo} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
        <div className="adm-form">
          <div className="adm-field">
            <label>Nombre</label>
            <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="adm-field">
            <label>Descripción</label>
            <input type="text" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="adm-panel">
        <h2>Preguntas ({preguntas.length})</h2>
        {preguntas.length === 0 && (
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>No hay preguntas todavía.</p>
        )}
        {preguntas.map((p) => (
          <div key={p.preguntaid} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: '0.9rem' }}>{p.pregunta}</strong>
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.8rem' }}
                onClick={() => handleDeletePregunta(p.preguntaid)}
              >
                Eliminar
              </button>
            </div>
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', paddingLeft: '0.5rem' }}>
              {p.respuestas_validas.map((r) => (
                <span key={r.respuestaid} style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', background: 'rgba(255,255,255,0.06)', borderRadius: '12px', color: 'rgba(255,255,255,0.7)' }}>
                  {r.respuesta}
                </span>
              ))}
            </div>
          </div>
        ))}

        <div style={{ marginTop: '1rem', padding: '1rem', border: '1px dashed rgba(255,255,255,0.12)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Agregar pregunta</span>
          <input
            type="text"
            value={newPregunta}
            onChange={(e) => setNewPregunta(e.target.value)}
            placeholder="Texto de la pregunta"
            style={{ padding: '0.5rem 0.75rem', fontSize: '0.9rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', outline: 'none' }}
          />
          {newRespuestas.map((r, ri) => (
            <div key={ri} style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
              <input
                type="text"
                value={r}
                onChange={(e) => { const next = [...newRespuestas]; next[ri] = e.target.value; setNewRespuestas(next) }}
                placeholder={`Respuesta ${ri + 1}`}
                style={{ flex: 1, padding: '0.4rem 0.65rem', fontSize: '0.85rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#fff', outline: 'none' }}
              />
              {newRespuestas.length > 2 && (
                <button type="button" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }} onClick={() => setNewRespuestas(newRespuestas.filter((_, idx) => idx !== ri))}>
                  ×
                </button>
              )}
            </div>
          ))}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="adm-btn adm-btn--ghost" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }} onClick={() => setNewRespuestas([...newRespuestas, ''])}>
              + Respuesta
            </button>
            <button type="button" className="adm-btn adm-btn--primary" style={{ fontSize: '0.8rem' }} onClick={handleAddPregunta} disabled={adding}>
              {adding ? 'Agregando…' : 'Agregar'}
            </button>
          </div>
        </div>

        {error && <p className="adm-error" role="alert">{error}</p>}
      </div>
    </div>
  )
}
