import { api } from './client.js'

export async function iniciarConexionGoogle() {
  const { url } = await api('/auth/google/connect')
  window.location.href = url
}

export async function estadoConexionGoogle() {
  return api('/auth/google/status')
}

export async function desconectarGoogle() {
  return api('/auth/google/disconnect', { method: 'POST' })
}
