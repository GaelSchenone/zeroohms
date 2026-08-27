import { useState, useEffect } from 'react'
import { apiBlob } from '../../api/client.js'

export default function useFotoBlob(fotoid, size = 'thumb') {
  const [url, setUrl] = useState(null)

  useEffect(() => {
    let objectUrl
    let activo = true
    setUrl(null)
    apiBlob(`/fotos/${fotoid}/archivo?size=${size}`)
      .then((blob) => {
        if (!activo) return
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
      .catch(() => {})
    return () => {
      activo = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [fotoid, size])

  return url
}
