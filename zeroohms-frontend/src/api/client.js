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
