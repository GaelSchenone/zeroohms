import { useState, useEffect, useCallback } from 'react'
import { api } from '../../api/client.js'
import { formatEstado, estadoClass, formatMoney } from '../../utils/format.js'
import Combobox from './Combobox.jsx'
import './PresupuestoEditor.css'

const TIPOS = [
  { value: 'repuesto', label: 'Repuesto' },
  { value: 'mano_obra', label: 'Mano de obra' },
  { value: 'otro', label: 'Otro' },
]

export default function PresupuestoEditor({ tkid }) {
  const [presupuestos, setPresupuestos] = useState([])
  const [estados, setEstados] = useState([])
  const [loading, setLoading] = useState(true)
  const [creando, setCreando] = useState(false)

  const fetchPresupuestos = useCallback(() => {
    setLoading(true)
    api(`/presupuestos?tkid=${tkid}`)
      .then(setPresupuestos)
      .catch(() => setPresupuestos([]))
      .finally(() => setLoading(false))
  }, [tkid])

  useEffect(() => { fetchPresupuestos() }, [fetchPresupuestos])
  useEffect(() => { api('/presupuestos/estados').then(setEstados).catch(() => setEstados([])) }, [])

  const crearPresupuesto = async () => {
    setCreando(true)
    try {
      await api('/presupuestos', { method: 'POST', body: { tkid: Number(tkid) } })
      fetchPresupuestos()
    } finally {
      setCreando(false)
    }
  }

  if (loading) return <div className="adm-loading">Cargando presupuesto…</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {presupuestos.map((p) => (
        <PresupuestoCard key={p.presupuestoid} presupuesto={p} estados={estados} onChange={fetchPresupuestos} />
      ))}
      <div>
        <button type="button" className="adm-btn adm-btn--primary" onClick={crearPresupuesto} disabled={creando}>
          {creando ? 'Creando…' : 'Añadir presupuesto'}
        </button>
      </div>
    </div>
  )
}

function agruparPorTipo(items) {
  return items.reduce((acc, it) => {
    if (!acc[it.tipo]) acc[it.tipo] = []
    acc[it.tipo].push(it)
    return acc
  }, {})
}

function PresupuestoCard({ presupuesto, estados, onChange }) {
  const [nuevoTipo, setNuevoTipo] = useState('repuesto')
  const [nuevaDesc, setNuevaDesc] = useState('')
  const [nuevaCant, setNuevaCant] = useState('1')
  const [nuevoPrecio, setNuevoPrecio] = useState('')
  const [guardandoItem, setGuardandoItem] = useState(false)
  const [cambiandoEstado, setCambiandoEstado] = useState(false)
  const [error, setError] = useState('')

  const agregarItem = async () => {
    if (!nuevaDesc.trim() || !nuevoPrecio) {
      setError('Completá la descripción y el precio unitario.')
      return
    }
    setError('')
    setGuardandoItem(true)
    try {
      await api('/items-presupuesto', {
        method: 'POST',
        body: {
          presupuestoid: presupuesto.presupuestoid,
          tipo: nuevoTipo,
          descripcion: nuevaDesc.trim(),
          cantidad: Number(nuevaCant) || 1,
          preciounitario: Number(nuevoPrecio),
        },
      })
      setNuevaDesc('')
      setNuevaCant('1')
      setNuevoPrecio('')
      onChange()
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardandoItem(false)
    }
  }

  const borrarItem = async (itemid) => {
    if (!window.confirm('¿Eliminar este ítem?')) return
    await api(`/items-presupuesto/${itemid}`, { method: 'DELETE' })
    onChange()
  }

  const cambiarEstado = async (posestadoId) => {
    setCambiandoEstado(true)
    try {
      await api(`/presupuestos/${presupuesto.presupuestoid}/estado`, {
        method: 'POST',
        body: { posestado_id: Number(posestadoId) },
      })
      onChange()
    } finally {
      setCambiandoEstado(false)
    }
  }

  const grupos = agruparPorTipo(presupuesto.items)

  return (
    <div className="adm-panel">
      <div className="adm-panel-head">
        <h2>Presupuesto #{presupuesto.presupuestoid}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span className={`adm-status adm-status--${estadoClass(presupuesto.estado_actual)}`}>
            {formatEstado(presupuesto.estado_actual)}
          </span>
          <Combobox
            placeholder="Cambiar estado…"
            value={null}
            disabled={cambiandoEstado}
            onChange={cambiarEstado}
            options={estados
              .filter((e) => e.nombre !== presupuesto.estado_actual)
              .map((e) => ({ value: e.id, label: formatEstado(e.nombre) }))}
          />
        </div>
      </div>

      {presupuesto.items.length === 0 ? (
        <p className="adm-empty">Todavía no se cargaron ítems.</p>
      ) : (
        Object.entries(grupos).map(([tipo, items]) => (
          <div key={tipo} className="pre-grupo">
            <h3 className="pre-grupo-titulo">{TIPOS.find((t) => t.value === tipo)?.label || tipo}</h3>
            {items.map((it) => (
              <div key={it.itempresupuestoid} className="pre-item-row">
                <span className="pre-item-desc">{it.descripcion}</span>
                <span className="pre-item-cant">{it.cantidad} ×</span>
                <span className="pre-item-precio">{formatMoney(it.preciounitario)}</span>
                <span className="pre-item-subtotal">{formatMoney(it.cantidad * it.preciounitario)}</span>
                <button type="button" className="pre-item-del" aria-label="Eliminar ítem" onClick={() => borrarItem(it.itempresupuestoid)}>×</button>
              </div>
            ))}
          </div>
        ))
      )}

      <div className="pre-nuevo-row">
        <Combobox value={nuevoTipo} onChange={setNuevoTipo} options={TIPOS} className="pre-nuevo-tipo" />
        <input
          className="pre-nuevo-input"
          placeholder="Descripción"
          value={nuevaDesc}
          onChange={(e) => setNuevaDesc(e.target.value)}
        />
        <input
          className="pre-nuevo-input pre-nuevo-cant"
          type="number"
          min="0"
          step="1"
          placeholder="Cant."
          value={nuevaCant}
          onChange={(e) => setNuevaCant(e.target.value)}
        />
        <input
          className="pre-nuevo-input pre-nuevo-precio"
          type="number"
          min="0"
          step="0.01"
          placeholder="Precio unit."
          value={nuevoPrecio}
          onChange={(e) => setNuevoPrecio(e.target.value)}
        />
        <button type="button" className="adm-btn adm-btn--subtle" onClick={agregarItem} disabled={guardandoItem}>
          {guardandoItem ? 'Agregando…' : 'Añadir ítem'}
        </button>
      </div>

      {error && <p className="adm-error" role="alert">{error}</p>}

      <div className="pre-total">Total: <strong>{formatMoney(presupuesto.monto)}</strong></div>
    </div>
  )
}
