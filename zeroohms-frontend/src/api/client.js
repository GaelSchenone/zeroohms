const BASE_URL = '/api'

function getToken() {
  return localStorage.getItem('token')
}

export function setToken(token) {
  localStorage.setItem('token', token)
}

export function clearToken() {
  localStorage.removeItem('token')
}

export async function apiBlob(path) {
  const token = getToken()
  const headers = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE_URL}${path}`, { headers })

  if (res.status === 401) {
    clearToken()
    window.location.href = '/login'
    throw new Error('Sesión expirada')
  }

  if (!res.ok) {
    let mensaje = 'Error del servidor'
    try {
      const data = await res.json()
      mensaje = data.detail || data.error || mensaje
    } catch {
      // la respuesta de error no era JSON
    }
    throw new Error(mensaje)
  }

  return res.blob()
}

export async function api(path, options = {}) {
  const { method = 'GET', body, headers: extraHeaders = {} } = options

  const headers = { ...extraHeaders }
  const token = getToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  if (body) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401 && !path.includes('/auth/login')) {
    clearToken()
    window.location.href = '/login'
    throw new Error('Sesión expirada')
  }

  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    if (!res.ok) {
      throw new Error(text || 'Error del servidor')
    }
    throw new Error('Respuesta inesperada del servidor')
  }

  if (!res.ok) {
    throw new Error(data.detail || data.error || 'Error del servidor')
  }

  return data
}
