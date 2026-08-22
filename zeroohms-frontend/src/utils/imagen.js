function renombrarAJpeg(nombre) {
  const base = String(nombre || 'foto').replace(/\.[^.]+$/, '')
  return `${base || 'foto'}.jpg`
}

export function redimensionarImagen(file, ladoMax = 2560, calidad = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      let { naturalWidth: width, naturalHeight: height } = img
      if (Math.max(width, height) > ladoMax) {
        const escala = ladoMax / Math.max(width, height)
        width = Math.round(width * escala)
        height = Math.round(height * escala)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('No se pudo procesar la imagen'))
            return
          }
          resolve(new File([blob], renombrarAJpeg(file.name), { type: 'image/jpeg' }))
        },
        'image/jpeg',
        calidad,
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer la imagen'))
    }
    img.src = url
  })
}
