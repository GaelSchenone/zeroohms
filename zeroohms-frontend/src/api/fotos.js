import { api } from './client.js'

const BASE_URL = '/api'

function getToken() {
  return localStorage.getItem('token')
}

export function listarFotos(tkid) {
  return api(`/fotos/ticket/${tkid}`)
}

export function crearSesionSubida(tkid) {
  return api(`/fotos/ticket/${tkid}/sesion`, { method: 'POST' })
}

export function borrarFoto(fotoid) {
  return api(`/fotos/${fotoid}`, { method: 'DELETE' })
}

export function urlArchivoFoto(fotoid, size = 'thumb') {
  return `${BASE_URL}/fotos/${fotoid}/archivo?size=${size}`
}

function subirConXhr(url, token, files, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const formData = new FormData()
    files.forEach((f) => formData.append('files', f))

    xhr.open('POST', url)
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total)
    }

    xhr.onload = () => {
      let data
      try {
        data = JSON.parse(xhr.responseText)
      } catch {
        data = null
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data)
      } else {
        reject(new Error(data?.detail || data?.error || 'Error al subir las fotos'))
      }
    }
    xhr.onerror = () => reject(new Error('Error de red al subir las fotos'))
    xhr.send(formData)
  })
}

export function subirFotosDesktop(tkid, files, onProgress) {
  return subirConXhr(`${BASE_URL}/fotos/ticket/${tkid}`, getToken(), files, onProgress)
}

export function subirFotosMovil(token, files, onProgress) {
  return subirConXhr(`${BASE_URL}/fotos/sesion/archivos`, token, files, onProgress)
}

export function infoSesionMovil(token) {
  return fetch(`${BASE_URL}/fotos/sesion`, { headers: { Authorization: `Bearer ${token}` } }).then(async (res) => {
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.detail || 'El enlace no es válido o venció')
    }
    return res.json()
  })
}
