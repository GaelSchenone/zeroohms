export const DEMO_USER = {
  username: 'admin',
  password: 'admin123',
  name: 'Gael Schenone',
  role: 'Técnico principal',
}

export const TICKETS = [
  { id: 'ZO-1042', cliente: 'María Fernández', equipo: 'Lenovo IdeaPad 3', problema: 'No enciende, carga 0%', estado: 'En reparación', fecha: '2026-08-10', presupuesto: 35000, prioridad: 'alta' },
  { id: 'ZO-1041', cliente: 'Jorge Díaz', equipo: 'PC de escritorio', problema: 'Pantalla azul al iniciar', estado: 'Esperando piezas', fecha: '2026-08-10', presupuesto: 48000, prioridad: 'media' },
  { id: 'ZO-1040', cliente: 'Lucía Gómez', equipo: 'MacBook Pro 2019', problema: 'Batería hinchada', estado: 'Presupuestado', fecha: '2026-08-09', presupuesto: 92000, prioridad: 'alta' },
  { id: 'ZO-1039', cliente: 'Carlos Ruiz', equipo: 'HP Pavilion', problema: 'Sobrecalentamiento', estado: 'Listo para entregar', fecha: '2026-08-09', presupuesto: 18000, prioridad: 'baja' },
  { id: 'ZO-1038', cliente: 'Ana Suárez', equipo: 'Dell Latitude', problema: 'No toma carga USB-C', estado: 'Nuevo', fecha: '2026-08-08', presupuesto: null, prioridad: 'media' },
  { id: 'ZO-1037', cliente: 'Pedro López', equipo: 'Acer Nitro 5', problema: 'Falla la GPU en juegos', estado: 'En reparación', fecha: '2026-08-08', presupuesto: 64000, prioridad: 'alta' },
  { id: 'ZO-1036', cliente: 'Sofía Martínez', equipo: 'Asus VivoBook', problema: 'Disco lento, revisión', estado: 'Entregado', fecha: '2026-08-07', presupuesto: 12000, prioridad: 'baja' },
  { id: 'ZO-1035', cliente: 'Martín Ríos', equipo: 'PC armada', problema: 'Se apaga sola bajo carga', estado: 'En reparación', fecha: '2026-08-07', presupuesto: 26000, prioridad: 'media' },
  { id: 'ZO-1034', cliente: 'Valentina Paz', equipo: 'Lenovo Legion 5', problema: 'Teclado con fallas', estado: 'Entregado', fecha: '2026-08-06', presupuesto: 21000, prioridad: 'baja' },
  { id: 'ZO-1033', cliente: 'Nicolás Vera', equipo: 'MSI GF63', problema: 'No da imagen', estado: 'Esperando piezas', fecha: '2026-08-06', presupuesto: 55000, prioridad: 'media' },
]

export const STATS = {
  activas: 5,
  nuevos: 1,
  listas: 2,
  esperandoPiezas: 2,
  facturacionMes: 381000,
}

export const ACTIVITY = [
  { text: 'ZO-1042 pasó a "En reparación"', time: 'Hace 25 min' },
  { text: 'Carlos Ruiz retiró la HP Pavilion (ZO-1039)', time: 'Hace 2 h' },
  { text: 'Presupuesto aprobado de Lucía Gómez (ZO-1040)', time: 'Hace 3 h' },
  { text: 'Nuevo ticket de Ana Suárez (ZO-1038)', time: 'Ayer' },
  { text: 'Se ordenaron 2 pantallas para ZO-1041 y ZO-1033', time: 'Ayer' },
]
