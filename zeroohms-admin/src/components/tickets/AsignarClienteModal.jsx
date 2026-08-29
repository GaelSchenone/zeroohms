import { useState, useEffect, useRef } from 'react'
import { api } from '../../api/client.js'
import useModalTransition from '../../hooks/useModalTransition.js'
import useStaggerReveal from '../../hooks/useStaggerReveal.js'
import './AsignarClienteModal.css'

const CLIENTE_VACIO = { dni: '', nombre: '', apellido: '', telefono: '', email: '' }

export default function AsignarClienteModal({ tkid, ticketActual, onClose, onAsignado }) {
  const [tab, setTab] = useState('buscar')
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState([])
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
  const [nuevoCliente, setNuevoCliente] = useState(CLIENTE_VACIO)

  const [dispositivos, setDispositivos] = useState([])
  const [dispositivoSeleccionado, setDispositivoSeleccionado] = useState('nuevo')
  const [equipo, setEquipo] = useState({
    marca: ticketActual?.dispositivo_marca || '',
    modelo: ticketActual?.dispositivo_modelo || '',
    numeroserie: ticketActual?.dispositivo_numeroserie || '',
  })

  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const dropdownRef = useRef(null)

  const { backdropRef, modalRef, requestClose } = useModalTransition(onClose)
  const resultadosRef = useStaggerReveal(resultados)
  const dispositivosRef = useStaggerReveal(dispositivos)

  useEffect(() => {
    if (busqueda.trim().length < 2) {
      setResultados([])
      return
    }
    let activo = true
    api(`/clientes?search=${encodeURIComponent(busqueda.trim())}&per_page=10`)
      .then((r) => { if (activo) setResultados(r) })
      .catch(() => { if (activo) setResultados([]) })
    return () => { activo = false }
  }, [busqueda])

  useEffect(() => {
    if (!clienteSeleccionado) {
      setDispositivos([])
      setDispositivoSeleccionado('nuevo')
      return
    }
    let activo = true
    api(`/dispositivos?dni=${encodeURIComponent(clienteSeleccionado.dni)}&per_page=50`)
      .then((d) => {
        if (!activo) return
        setDispositivos(d)
        setDispositivoSeleccionado(d.length ? String(d[0].dispositivoid) : 'nuevo')
      })
      .catch(() => { if (activo) setDispositivos([]) })
    return () => { activo = false }
  }, [clienteSeleccionado])

  const seleccionarResultado = (c) => {
    setClienteSeleccionado(c)
    setBusqueda(`${c.nombre || ''} ${c.apellido || ''}`.trim() || c.dni)
    setResultados([])
  }

  const handleGuardar = async () => {
    setError('')
    setGuardando(true)
    try {
      let dni

      if (tab === 'buscar') {
        if (!clienteSeleccionado) {
          setError('Buscá y seleccioná un cliente de la lista.')
          setGuardando(false)
          return
        }
        dni = clienteSeleccionado.dni
      } else {
        if (!nuevoCliente.dni.trim()) {
          setError('El DNI es obligatorio para crear el cliente.')
          setGuardando(false)
          return
        }
        const creado = await api('/clientes', {
          method: 'POST',
          body: {
            dni: nuevoCliente.dni.trim(),
            nombre: nuevoCliente.nombre.trim() || null,
            apellido: nuevoCliente.apellido.trim() || null,
            telefono: nuevoCliente.telefono.trim() || null,
            email: nuevoCliente.email.trim() || null,
          },
        })
        dni = creado.dni
      }

      let dispositivoid
      if (tab === 'buscar' && dispositivoSeleccionado !== 'nuevo') {
        dispositivoid = Number(dispositivoSeleccionado)
      } else {
        const disp = await api('/dispositivos', {
          method: 'POST',
          body: {
            dni,
            marca: equipo.marca.trim() || null,
            modelo: equipo.modelo.trim() || null,
            numeroserie: equipo.numeroserie.trim() || null,
          },
        })
        dispositivoid = disp.dispositivoid
      }

      await api(`/tickets/${tkid}`, {
        method: 'PUT',
        body: { dispositivoid },
      })

      onAsignado?.()
      requestClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div ref={backdropRef} className="acm-backdrop" role="dialog" aria-modal="true" aria-label="Cambiar cliente del ticket">
      <div ref={modalRef} className="acm-modal">
        <div className="acm-head">
          <h2>Cambiar cliente del ticket</h2>
          <button type="button" className="acm-close" aria-label="Cerrar" onClick={requestClose}>×</button>
        </div>

        <div className="acm-tabs">
          <button
            type="button"
            className={`acm-tab${tab === 'buscar' ? ' is-active' : ''}`}
            onClick={() => setTab('buscar')}
          >
            Buscar cliente existente
          </button>
          <button
            type="button"
            className={`acm-tab${tab === 'nuevo' ? ' is-active' : ''}`}
            onClick={() => setTab('nuevo')}
          >
            Crear cliente nuevo
          </button>
        </div>

        <div className="acm-body">
          {tab === 'buscar' ? (
            <div ref={dropdownRef} style={{ position: 'relative' }}>
              <label className="acm-label">Buscar por nombre, apellido o DNI</label>
              <input
                type="text"
                className="acm-input"
                placeholder="Ej: Fernández o 34221908"
                value={busqueda}
                onChange={(e) => { setBusqueda(e.target.value); setClienteSeleccionado(null) }}
              />
              {resultados.length > 0 && (
                <div ref={resultadosRef} className="acm-results">
                  {resultados.map((c) => (
                    <button
                      type="button"
                      key={c.dni}
                      className="acm-result-row"
                      onClick={() => seleccionarResultado(c)}
                    >
                      <span className="name">{c.nombre || ''} {c.apellido || ''}</span>
                      <span className="dni">DNI {c.dni}</span>
                    </button>
                  ))}
                </div>
              )}
              {clienteSeleccionado && (
                <div className="acm-result-row selected" style={{ marginTop: '0.5rem' }}>
                  <span className="name">{clienteSeleccionado.nombre || ''} {clienteSeleccionado.apellido || ''}</span>
                  <span className="check">✓ Seleccionado</span>
                </div>
              )}
            </div>
          ) : (
            <div className="acm-field-row">
              <div><label className="acm-label">DNI *</label><input className="acm-input" value={nuevoCliente.dni} onChange={(e) => setNuevoCliente({ ...nuevoCliente, dni: e.target.value })} /></div>
              <div><label className="acm-label">Nombre</label><input className="acm-input" value={nuevoCliente.nombre} onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })} /></div>
              <div><label className="acm-label">Apellido</label><input className="acm-input" value={nuevoCliente.apellido} onChange={(e) => setNuevoCliente({ ...nuevoCliente, apellido: e.target.value })} /></div>
              <div><label className="acm-label">Teléfono</label><input className="acm-input" value={nuevoCliente.telefono} onChange={(e) => setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })} /></div>
              <div style={{ gridColumn: '1 / -1' }}><label className="acm-label">Email</label><input className="acm-input" value={nuevoCliente.email} onChange={(e) => setNuevoCliente({ ...nuevoCliente, email: e.target.value })} /></div>
            </div>
          )}

          {tab === 'buscar' && clienteSeleccionado && dispositivos.length > 0 && (
            <>
              <div className="acm-section-label"><span>Equipo para este ticket</span><span className="line" /></div>
              <div ref={dispositivosRef} className="acm-results">
                {dispositivos.map((d) => (
                  <label className="acm-result-row acm-radio-row" key={d.dispositivoid}>
                    <input
                      type="radio"
                      name="dispositivo"
                      checked={dispositivoSeleccionado === String(d.dispositivoid)}
                      onChange={() => setDispositivoSeleccionado(String(d.dispositivoid))}
                    />
                    <span className="name">{[d.marca, d.modelo].filter(Boolean).join(' ') || `Equipo #${d.dispositivoid}`}</span>
                    <span className="dni">{d.numeroserie || ''}</span>
                  </label>
                ))}
                <label className="acm-result-row acm-radio-row">
                  <input
                    type="radio"
                    name="dispositivo"
                    checked={dispositivoSeleccionado === 'nuevo'}
                    onChange={() => setDispositivoSeleccionado('nuevo')}
                  />
                  <span className="name">Otro equipo (nuevo)</span>
                </label>
              </div>
            </>
          )}

          {(tab === 'nuevo' || dispositivoSeleccionado === 'nuevo') && (
            <>
              <div className="acm-section-label"><span>Datos del equipo</span><span className="line" /></div>
              <div className="acm-field-row">
                <div><label className="acm-label">Marca</label><input className="acm-input" value={equipo.marca} onChange={(e) => setEquipo({ ...equipo, marca: e.target.value })} /></div>
                <div><label className="acm-label">Modelo</label><input className="acm-input" value={equipo.modelo} onChange={(e) => setEquipo({ ...equipo, modelo: e.target.value })} /></div>
                <div style={{ gridColumn: '1 / -1' }}><label className="acm-label">Número de serie</label><input className="acm-input" value={equipo.numeroserie} onChange={(e) => setEquipo({ ...equipo, numeroserie: e.target.value })} /></div>
              </div>
            </>
          )}

          {error && <p className="adm-error" role="alert">{error}</p>}
        </div>

        <div className="acm-foot">
          <button type="button" className="adm-btn adm-btn--subtle" onClick={requestClose}>Cancelar</button>
          <button type="button" className="adm-btn adm-btn--primary" onClick={handleGuardar} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar asignación'}
          </button>
        </div>
      </div>
    </div>
  )
}
