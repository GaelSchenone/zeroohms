import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client.js'

const CHIPS_ACCESORIOS = [
  'Cargador / fuente',
  'Cables (HDMI, USB, poder)',
  'Funda / bolso / caja',
  'Periféricos (mouse, teclado, mando)',
  'Repuesto traído por el cliente',
]

export default function TicketCreate() {
  const navigate = useNavigate()
  const [clienteExistente, setClienteExistente] = useState(false)
  const [clientes, setClientes] = useState([])
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [dispositivo, setDispositivo] = useState({ marca: '', modelo: '', numeroserie: '' })
  const [descripcion, setDescripcion] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [nuevoCliente, setNuevoCliente] = useState({ dni: '', nombre: '', apellido: '', telefono: '', email: '' })
  const [accesoriosSel, setAccesoriosSel] = useState([])
  const [accesorioOtro, setAccesorioOtro] = useState('')
  const [accesoriosAviso, setAccesoriosAviso] = useState('')
  const [creado, setCreado] = useState(null)
  const [copiado, setCopiado] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (busqueda.trim().length >= 2) {
      api(`/clientes?search=${busqueda.trim()}&per_page=10`)
        .then(setClientes)
        .catch(() => setClientes([]))
    } else {
      setClientes([])
    }
  }, [busqueda])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const seleccionarCliente = (c) => {
    setClienteSeleccionado(c)
    setBusqueda(`${c.nombre || ''} ${c.apellido || ''} — DNI ${c.dni}`.trim())
    setShowDropdown(false)
    setClientes([])
  }

  const limpiarCliente = () => {
    setClienteSeleccionado(null)
    setBusqueda('')
    setClientes([])
  }

  const toggleClienteExistente = (checked) => {
    setClienteExistente(checked)
    setClienteSeleccionado(null)
    setBusqueda('')
    setClientes([])
    setShowDropdown(false)
    setNuevoCliente({ dni: '', nombre: '', apellido: '', telefono: '', email: '' })
  }

  const copiarCodigo = async () => {
    try {
      await navigator.clipboard.writeText(creado.codigoseguimiento)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      window.prompt('Copiá el código manualmente:', creado.codigoseguimiento)
    }
  }

  const toggleAccesorio = (nombre) => {
    setAccesoriosSel((prev) => (prev.includes(nombre) ? prev.filter((n) => n !== nombre) : [...prev, nombre]))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setAccesoriosAviso('')
    try {
      let dni
      if (clienteExistente) {
        if (!clienteSeleccionado) {
          setError('Buscá y seleccioná un cliente existente.')
          setSaving(false)
          return
        }
        dni = clienteSeleccionado.dni
      } else {
        if (!nuevoCliente.dni.trim()) {
          setError('Ingresá el DNI del cliente.')
          setSaving(false)
          return
        }
        const nuevo = await api('/clientes', {
          method: 'POST',
          body: {
            dni: nuevoCliente.dni.trim(),
            nombre: nuevoCliente.nombre || null,
            apellido: nuevoCliente.apellido || null,
            telefono: nuevoCliente.telefono || null,
            email: nuevoCliente.email || null,
          },
        })
        dni = nuevo.dni
      }

      const disp = await api('/dispositivos', {
        method: 'POST',
        body: {
          dni,
          marca: dispositivo.marca || null,
          modelo: dispositivo.modelo || null,
          numeroserie: dispositivo.numeroserie || null,
        },
      })
      const ticket = await api('/tickets', {
        method: 'POST',
        body: {
          dispositivoid: disp.dispositivoid,
          descripcion_problema: descripcion || null,
        },
      })
      setCreado(ticket)

      const nombresAccesorios = [...accesoriosSel]
      if (accesorioOtro.trim()) nombresAccesorios.push(accesorioOtro.trim())
      if (nombresAccesorios.length > 0) {
        const resultados = await Promise.allSettled(
          nombresAccesorios.map((nombre) => api('/accesorios', { method: 'POST', body: { tkid: ticket.tkid, nombre } })),
        )
        const fallidos = resultados.filter((r) => r.status === 'rejected').length
        if (fallidos > 0) {
          setAccesoriosAviso(`El ticket se creó, pero no se pudieron guardar ${fallidos} accesorio(s).`)
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="adm-panel" style={{ maxWidth: '600px' }}>
      <h2>Nuevo ticket</h2>

      {creado && (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '0.75rem',
          padding: '1rem', background: 'rgba(34,197,94,0.08)',
          border: '1px solid rgba(34,197,94,0.3)', borderRadius: '10px',
        }}>
          <strong style={{ color: '#6ee79f' }}>✓ Ticket #{creado.tkid} creado</strong>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <code style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.05em' }}>
              {creado.codigoseguimiento}
            </code>
            <button type="button" className="adm-btn adm-btn--ghost" onClick={copiarCodigo}>
              {copiado ? '¡Copiado!' : 'Copiar código'}
            </button>
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
            Compartí este código con el cliente para que siga su reparación desde la página pública.
          </p>
          {accesoriosAviso && (
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#f5c46a' }}>{accesoriosAviso}</p>
          )}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <a className="adm-btn adm-btn--primary" href={`/tracking?c=${creado.codigoseguimiento}`} target="_blank" rel="noreferrer">
              Seguir reparación
            </a>
            <button type="button" className="adm-btn adm-btn--ghost" onClick={() => navigate(`/tickets/${creado.tkid}`)}>
              Ver ticket
            </button>
          </div>
        </div>
      )}

      <form className="adm-form" onSubmit={handleSubmit}>
        <fieldset style={{ border: 'none', padding: 0, display: 'contents' }}>
          <legend style={{ fontWeight: 600, fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Cliente
          </legend>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
            <input
              type="checkbox"
              checked={clienteExistente}
              onChange={(e) => toggleClienteExistente(e.target.checked)}
            />
            El cliente ya existe
          </label>

          {clienteExistente ? (
            <div className="adm-field" ref={dropdownRef} style={{ position: 'relative' }}>
              <label>Buscar cliente *</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => { setBusqueda(e.target.value); setClienteSeleccionado(null); setShowDropdown(true) }}
                  onFocus={() => { if (clientes.length > 0) setShowDropdown(true) }}
                  placeholder="Buscar por nombre, apellido o DNI…"
                  style={{ flex: 1 }}
                />
                {clienteSeleccionado && (
                  <button type="button" className="adm-btn adm-btn--ghost" onClick={limpiarCliente}>
                    ×
                  </button>
                )}
              </div>
              {showDropdown && clientes.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
                  background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '8px', marginTop: '0.25rem', maxHeight: '200px', overflow: 'auto',
                }}>
                  {clientes.map((c) => (
                    <button
                      key={c.dni}
                      type="button"
                      style={{
                        display: 'block', width: '100%', padding: '0.6rem 0.85rem',
                        background: 'transparent', border: 'none', textAlign: 'left',
                        color: '#fff', cursor: 'pointer', fontSize: '0.85rem',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                      }}
                      onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.06)'}
                      onMouseLeave={(e) => e.target.style.background = 'transparent'}
                      onClick={() => seleccionarCliente(c)}
                    >
                      <strong>{c.nombre || ''} {c.apellido || ''}</strong>
                      <span style={{ color: 'rgba(255,255,255,0.45)', marginLeft: '0.5rem' }}>DNI {c.dni}</span>
                    </button>
                  ))}
                </div>
              )}
              {showDropdown && busqueda.trim().length >= 2 && clientes.length === 0 && !clienteSeleccionado && (
                <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                  No encontramos ningún cliente con esa búsqueda. Desmarcá "El cliente ya existe" para cargarlo como nuevo.
                </p>
              )}
              {clienteSeleccionado && (
                <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '6px', fontSize: '0.85rem', color: '#6ee79f' }}>
                  ✓ {clienteSeleccionado.nombre || ''} {clienteSeleccionado.apellido || ''} — DNI {clienteSeleccionado.dni}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="adm-field">
                <label>DNI *</label>
                <input
                  type="text"
                  value={nuevoCliente.dni}
                  onChange={(e) => setNuevoCliente({ ...nuevoCliente, dni: e.target.value })}
                  placeholder="Ej: 30123456"
                />
              </div>
              <div className="adm-field">
                <label>Nombre</label>
                <input
                  type="text"
                  value={nuevoCliente.nombre}
                  onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })}
                />
              </div>
              <div className="adm-field">
                <label>Apellido</label>
                <input
                  type="text"
                  value={nuevoCliente.apellido}
                  onChange={(e) => setNuevoCliente({ ...nuevoCliente, apellido: e.target.value })}
                />
              </div>
              <div className="adm-field">
                <label>Teléfono</label>
                <input
                  type="tel"
                  value={nuevoCliente.telefono}
                  onChange={(e) => setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })}
                />
              </div>
              <div className="adm-field">
                <label>Email</label>
                <input
                  type="email"
                  value={nuevoCliente.email}
                  onChange={(e) => setNuevoCliente({ ...nuevoCliente, email: e.target.value })}
                />
              </div>
            </>
          )}
        </fieldset>

        <fieldset style={{ border: 'none', padding: 0, display: 'contents' }}>
          <legend style={{ fontWeight: 600, fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Dispositivo
          </legend>
          <div className="adm-field">
            <label>Marca</label>
            <input type="text" value={dispositivo.marca} onChange={(e) => setDispositivo({ ...dispositivo, marca: e.target.value })} placeholder="Ej: Lenovo" />
          </div>
          <div className="adm-field">
            <label>Modelo</label>
            <input type="text" value={dispositivo.modelo} onChange={(e) => setDispositivo({ ...dispositivo, modelo: e.target.value })} placeholder="Ej: IdeaPad 3" />
          </div>
          <div className="adm-field">
            <label>Número de serie</label>
            <input type="text" value={dispositivo.numeroserie} onChange={(e) => setDispositivo({ ...dispositivo, numeroserie: e.target.value })} placeholder="Opcional" />
          </div>
        </fieldset>

        <fieldset style={{ border: 'none', padding: 0, display: 'contents' }}>
          <legend style={{ fontWeight: 600, fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Accesorios que entregó el cliente
          </legend>
          <div className="adm-field">
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {CHIPS_ACCESORIOS.map((nombre) => (
                <button
                  key={nombre}
                  type="button"
                  className={`adm-filter${accesoriosSel.includes(nombre) ? ' is-active' : ''}`}
                  onClick={() => toggleAccesorio(nombre)}
                >
                  {nombre}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={accesorioOtro}
              onChange={(e) => setAccesorioOtro(e.target.value)}
              placeholder="Otro (opcional)"
              style={{ marginTop: '0.5rem' }}
            />
          </div>
        </fieldset>

        <div className="adm-field">
          <label>Descripción del problema</label>
          <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Describe el problema…" />
        </div>

        {error && <p className="adm-error" role="alert">{error}</p>}

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="adm-btn adm-btn--primary" type="submit" disabled={saving}>
            {saving ? 'Creando…' : 'Crear ticket'}
          </button>
          <button className="adm-btn adm-btn--ghost" type="button" onClick={() => navigate('/tickets')}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
