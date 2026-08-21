import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client.js'

export default function ChecklistCreate() {
  const navigate = useNavigate()
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [preguntas, setPreguntas] = useState([{ texto: '', respuestas: ['', ''] }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const addPregunta = () => setPreguntas([...preguntas, { texto: '', respuestas: ['', ''] }])

  const removePregunta = (i) => setPreguntas(preguntas.filter((_, idx) => idx !== i))

  const updatePregunta = (i, field, val) => {
    const next = [...preguntas]
    next[i] = { ...next[i], [field]: val }
    setPreguntas(next)
  }

  const addRespuesta = (i) => {
    const next = [...preguntas]
    next[i] = { ...next[i], respuestas: [...next[i].respuestas, ''] }
    setPreguntas(next)
  }

  const updateRespuesta = (pi, ri, val) => {
    const next = [...preguntas]
    const resp = [...next[pi].respuestas]
    resp[ri] = val
    next[pi] = { ...next[pi], respuestas: resp }
    setPreguntas(next)
  }

  const removeRespuesta = (pi, ri) => {
    const next = [...preguntas]
    next[pi] = { ...next[pi], respuestas: next[pi].respuestas.filter((_, idx) => idx !== ri) }
    setPreguntas(next)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!nombre.trim()) { setError('El nombre es obligatorio.'); return }
    if (preguntas.length === 0) { setError('Agregá al menos una pregunta.'); return }
    for (const p of preguntas) {
      if (!p.texto.trim()) { setError('Todas las preguntas deben tener texto.'); return }
      if (p.respuestas.filter((r) => r.trim()).length < 2) { setError('Cada pregunta necesita al menos 2 respuestas.'); return }
    }

    setSaving(true)
    setError('')
    try {
      const cl = await api('/checklists', {
        method: 'POST',
        body: { nombre: nombre.trim(), descripcion: descripcion.trim() || null },
      })
      for (const p of preguntas) {
        await api(`/checklists/${cl.checklistid}/preguntas`, {
          method: 'POST',
          body: {
            pregunta: p.texto.trim(),
            respuestas: p.respuestas.filter((r) => r.trim()).map((r) => ({ respuesta: r.trim() })),
          },
        })
      }
      navigate(`/admin/checklists/${cl.checklistid}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="adm-panel" style={{ maxWidth: '700px' }}>
      <h2>Nueva checklist</h2>

      <form className="adm-form" onSubmit={handleSubmit}>
        <div className="adm-field">
          <label>Nombre *</label>
          <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Diagnóstico - Computadora" />
        </div>
        <div className="adm-field">
          <label>Descripción</label>
          <input type="text" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Opcional" />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Preguntas
          </span>

          {preguntas.map((p, pi) => (
            <div key={pi} style={{ padding: '1rem', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="text"
                  value={p.texto}
                  onChange={(e) => updatePregunta(pi, 'texto', e.target.value)}
                  placeholder={`Pregunta ${pi + 1}`}
                  style={{ flex: 1, padding: '0.5rem 0.75rem', fontSize: '0.9rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', outline: 'none' }}
                />
                {preguntas.length > 1 && (
                  <button type="button" className="adm-btn adm-btn--ghost" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', color: '#f87171', borderColor: 'rgba(239,68,68,0.4)' }} onClick={() => removePregunta(pi)}>
                    Quitar
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', paddingLeft: '0.5rem' }}>
                <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase' }}>Respuestas válidas</span>
                {p.respuestas.map((r, ri) => (
                  <div key={ri} style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={r}
                      onChange={(e) => updateRespuesta(pi, ri, e.target.value)}
                      placeholder={`Respuesta ${ri + 1}`}
                      style={{ flex: 1, padding: '0.4rem 0.65rem', fontSize: '0.85rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#fff', outline: 'none' }}
                    />
                    {p.respuestas.length > 2 && (
                      <button type="button" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '0.85rem' }} onClick={() => removeRespuesta(pi, ri)}>
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" className="adm-btn adm-btn--ghost" style={{ alignSelf: 'flex-start', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => addRespuesta(pi)}>
                  + Respuesta
                </button>
              </div>
            </div>
          ))}

          <button type="button" className="adm-btn adm-btn--ghost" onClick={addPregunta}>
            + Agregar pregunta
          </button>
        </div>

        {error && <p className="adm-error" role="alert">{error}</p>}

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="adm-btn adm-btn--primary" type="submit" disabled={saving}>
            {saving ? 'Creando…' : 'Crear checklist'}
          </button>
          <button className="adm-btn adm-btn--ghost" type="button" onClick={() => navigate('/admin/checklists')}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
