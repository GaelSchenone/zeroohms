const LABELS = {
  'ticket_creado': 'Ticket creado',
  'equipo_recibido': 'Equipo recibido',
  'diagnostico_realizado': 'Diagnóstico realizado',
  'esperando_aprobacion': 'Esperando aprobación',
  'en_reparacion': 'En reparación',
  'reparacion_finalizada': 'Reparación finalizada',
  'listo_para_retirar': 'Listo para retirar',
  'cancelado': 'Cancelado',
  'nuevo': 'Nuevo',
  'presupuestado': 'Presupuestado',
  'en reparación': 'En reparación',
  'esperando piezas': 'Esperando piezas',
  'listo para entregar': 'Listo para entregar',
  'entregado': 'Entregado',
  'pendiente': 'Pendiente',
  'en progreso': 'En progreso',
  'completada': 'Completada',
  'completado': 'Completado',
  'borrador': 'Borrador',
  'aprobado': 'Aprobado',
  'rechazado': 'Rechazado',
}

export function formatEstado(estado) {
  if (!estado) return '—'
  return LABELS[estado.toLowerCase()] || estado.charAt(0).toUpperCase() + estado.slice(1)
}

export function estadoClass(estado) {
  if (!estado) return ''
  return estado.toLowerCase().replace(/[ _]/g, '-')
}

export function formatMoney(value) {
  if (value == null || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value)
}

export function diasDesde(fechaIso) {
  if (!fechaIso) return null
  const ms = Date.now() - new Date(fechaIso).getTime()
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)))
}

export function tonoAntiguedad(dias) {
  if (dias == null) return 'ok'
  if (dias >= 6) return 'bad'
  if (dias >= 3) return 'warn'
  return 'ok'
}

export function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
