import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client.js'

export default function ChecklistRun() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [checklist, setChecklist] = useState(null)
  const [preguntas, setPreguntas] = useState([])
  const [loading, setLoading] = useState(true)
  const [tkid, setTkid] = useState('')
  const [respuestas, setRespuestas] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    Promise.all([
      api('/checklists'),
      api(`/checklists/${id}/preguntas`),
    ])
      .then(([lists, preg]) => {
        setChecklist(lists.find((c) => String(c.checklistid) === String(id)))
        setPreguntas(preg)
        const init = {}
        preg.forEach((p) => { init[p.preguntaid] = { respuestaid: '', observacion: '' } })
        setRespuestas(init)
      })
      .catch(() => navigate('/admin/checklists'))
      .finally(() => setLoading(false))
  }, [id, navigate])

  const handleChange = (preguntaId, field, value) => {
    setRespuestas((prev) => ({
      ...prev,
      [preguntaId]: { ...prev[preguntaId], [field]: value },
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!tkid.trim()) {
      setError('Ingresá el ID del ticket.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const respArray = Object.entries(respuestas)
        .filter(([, r]) => r.respuestaid)
        .map(([preguntaId, r]) => ({
          preguntaid: Number(preguntaId),
          respuestaid: Number(r.respuestaid),
          observacion: r.observacion || null,
        }))

      if (respArray.length === 0) {
        setError('Seleccioná al menos una respuesta.')
        setSaving(false)
        return
      }

      await api('/ejecuciones', {
        method: 'POST',
        body: {
          checklistid: Number(id),
          usuario: 'admin',
          tkid: Number(tkid),
          respuestas: respArray,
        },
      })
      setSuccess(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="adm-loading">Cargando checklist…</div>

  if (success) {
    return (
      <div className="adm-panel" style={{ maxWidth: '600px', textAlign: 'center' }}>
        <h2>Checklist completado</h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', margin: '1rem 0' }}>
          Las respuestas se guardaron correctamente para el ticket #{tkid}.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
          <button className="adm-btn adm-btn--primary" onClick={() => navigate(`/admin/tickets/${tkid}`)}>
            Ver ticket
          </button>
          <button className="adm-btn adm-btn--ghost" onClick={() => navigate('/admin/checklists')}>
            Volver a checklists
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="adm-panel" style={{ maxWidth: '700px' }}>
      <div className="adm-panel-head">
        <h2>{checklist?.nombre || `Checklist #${id}`}</h2>
      </div>

      {checklist?.descripcion && (
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>{checklist.descripcion}</p>
      )}

      <form className="adm-form" onSubmit={handleSubmit}>
        <div className="adm-field">
          <label>Ticket ID *</label>
          <input
            type="number"
            value={tkid}
            onChange={(e) => setTkid(e.target.value)}
            placeholder="Ej: 1"
          />
        </div>

        {preguntas.map((p) => (
          <div key={p.preguntaid} className="adm-field">
            <label>{p.pregunta}</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {p.respuestas_validas.map((r) => (
                <button
                  key={r.respuestaid}
                  type="button"
                  className={`adm-filter${respuestas[p.preguntaid]?.respuestaid === String(r.respuestaid) ? ' is-active' : ''}`}
                  onClick={() => handleChange(p.preguntaid, 'respuestaid', String(r.respuestaid))}
                >
                  {r.respuesta}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Observación (opcional)"
              value={respuestas[p.preguntaid]?.observacion || ''}
              onChange={(e) => handleChange(p.preguntaid, 'observacion', e.target.value)}
              style={{
                marginTop: '0.25rem', padding: '0.5rem 0.75rem', fontSize: '0.85rem',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px', color: '#fff', outline: 'none',
              }}
            />
          </div>
        ))}

        {error && <p className="adm-error" role="alert">{error}</p>}

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="adm-btn adm-btn--primary" type="submit" disabled={saving}>
            {saving ? 'Enviando…' : 'Enviar checklist'}
          </button>
          <button className="adm-btn adm-btn--ghost" type="button" onClick={() => navigate('/admin/checklists')}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
