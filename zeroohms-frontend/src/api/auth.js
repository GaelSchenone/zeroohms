import { api, setToken, clearToken } from './client.js'

export async function login(usuario, clave) {
  const data = await api('/auth/login', {
    method: 'POST',
    body: { usuario, clave },
  })
  setToken(data.access_token)
  return data
}

export async function getMe() {
  return api('/auth/me')
}

export function logout() {
  clearToken()
}

export function isAuthenticated() {
  return !!localStorage.getItem('token')
}
