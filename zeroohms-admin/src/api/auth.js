import { api, setToken, clearToken } from './client.js'

export async function login(usuario, clave) {
  return api('/auth/login', {
    method: 'POST',
    body: { usuario, clave },
  })
}

export async function verifyOtp(usuario, codigo, recordar) {
  const data = await api('/auth/login/verify', {
    method: 'POST',
    body: { usuario, codigo, recordar },
  })
  setToken(data.access_token)
  return data
}

export async function getMe() {
  return api('/auth/me')
}

export async function cambiarPassword(claveActual, claveNueva) {
  return api('/auth/me/password', {
    method: 'PUT',
    body: { clave_actual: claveActual, clave_nueva: claveNueva },
  })
}

export function logout() {
  clearToken()
}

export function isAuthenticated() {
  return !!localStorage.getItem('token')
}
