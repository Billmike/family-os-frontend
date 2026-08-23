/** Downscale and re-encode an image as JPEG for receipt upload. */
export const compressImageForUpload = async (
  file: File,
  options?: { maxEdge?: number; quality?: number },
): Promise<File> => {
  const maxEdge = options?.maxEdge ?? 1600
  const quality = options?.quality ?? 0.8

  if (!file.type.startsWith('image/') && file.type !== '') {
    return file
  }

  const objectUrl = URL.createObjectURL(file)
  try {
    const img = await loadImage(objectUrl)
    const { width, height } = img
    const scale = Math.min(1, maxEdge / Math.max(width, height))
    const targetW = Math.max(1, Math.round(width * scale))
    const targetH = Math.max(1, Math.round(height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return file
    }
    ctx.drawImage(img, 0, 0, targetW, targetH)

    const blob = await new Promise<Blob | null>(resolve => {
      canvas.toBlob(resolve, 'image/jpeg', quality)
    })
    if (!blob) {
      return file
    }

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'receipt'
    return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' })
  } catch {
    return file
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = src
  })
