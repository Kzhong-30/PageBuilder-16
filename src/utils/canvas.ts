import type { Annotation, Point } from '@/types'

const offscreenCache = new WeakMap<HTMLImageElement, HTMLCanvasElement>()

function getOffscreenCanvas(img: HTMLImageElement): HTMLCanvasElement {
  let cached = offscreenCache.get(img)
  if (cached) return cached

  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)
  offscreenCache.set(img, canvas)
  return canvas
}

export function clearOffscreenCache(img?: HTMLImageElement) {
  if (img) {
    offscreenCache.delete(img)
  }
}

export function drawAnnotation(
  ctx: CanvasRenderingContext2D,
  annotation: Annotation,
  scale: number = 1,
  baseImage?: HTMLImageElement,
  dpr: number = 1
) {
  ctx.save()
  ctx.scale(scale, scale)

  const { type, x, y, width, height, color, text, points } = annotation
  const lw = annotation.lineWidth / dpr

  switch (type) {
    case 'rect':
      ctx.strokeStyle = color
      ctx.lineWidth = lw
      ctx.strokeRect(x, y, width, height)
      break

    case 'circle': {
      ctx.strokeStyle = color
      ctx.lineWidth = lw
      const cx = x + width / 2
      const cy = y + height / 2
      const rx = Math.abs(width / 2)
      const ry = Math.abs(height / 2)
      ctx.beginPath()
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
      ctx.stroke()
      break
    }

    case 'arrow': {
      ctx.strokeStyle = color
      ctx.fillStyle = color
      ctx.lineWidth = lw
      const endX = x + width
      const endY = y + height
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(endX, endY)
      ctx.stroke()
      const angle = Math.atan2(height, width)
      const headLen = 14
      ctx.beginPath()
      ctx.moveTo(endX, endY)
      ctx.lineTo(
        endX - headLen * Math.cos(angle - Math.PI / 6),
        endY - headLen * Math.sin(angle - Math.PI / 6)
      )
      ctx.lineTo(
        endX - headLen * Math.cos(angle + Math.PI / 6),
        endY - headLen * Math.sin(angle + Math.PI / 6)
      )
      ctx.closePath()
      ctx.fill()
      break
    }

    case 'text': {
      ctx.fillStyle = color
      ctx.font = `${Math.max(lw * 6, 14)}px "DM Sans", sans-serif`
      ctx.fillText(text || '文字标注', x, y)
      break
    }

    case 'mosaic': {
      if (baseImage) {
        const offscreen = getOffscreenCanvas(baseImage)
        try {
          const mx = Math.max(0, Math.floor(x))
          const my = Math.max(0, Math.floor(y))
          const mw = Math.min(Math.abs(width), offscreen.width - Math.floor(x))
          const mh = Math.min(Math.abs(height), offscreen.height - Math.floor(y))
          const imageData = offscreen.getContext('2d')!.getImageData(mx, my, mw, mh)
          const pixelated = applyMosaic(imageData, 0, 0, imageData.width, imageData.height)
          const tempCanvas = document.createElement('canvas')
          tempCanvas.width = mw
          tempCanvas.height = mh
          tempCanvas.getContext('2d')!.putImageData(pixelated, 0, 0)
          ctx.drawImage(tempCanvas, 0, 0, mw, mh, x, y, Math.abs(width), Math.abs(height))
        } catch {
          // ignore CORS errors
        }
      } else {
        ctx.fillStyle = 'rgba(128,128,128,0.7)'
        ctx.fillRect(x, y, width, height)
      }
      ctx.strokeStyle = color
      ctx.lineWidth = 1 / dpr
      ctx.setLineDash([4, 4])
      ctx.strokeRect(x, y, width, height)
      ctx.setLineDash([])
      break
    }

    case 'pen': {
      if (points && points.length > 1) {
        ctx.strokeStyle = color
        ctx.lineWidth = lw
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.beginPath()
        ctx.moveTo(points[0].x, points[0].y)
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y)
        }
        ctx.stroke()
      }
      break
    }
  }

  ctx.restore()
}

export function drawAllAnnotations(
  ctx: CanvasRenderingContext2D,
  annotations: Annotation[],
  scale: number = 1,
  baseImage?: HTMLImageElement,
  selectedAnnotationId?: string | null,
  dpr: number = 1
) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  for (const ann of annotations) {
    drawAnnotation(ctx, ann, scale, baseImage, dpr)
    if (selectedAnnotationId && ann.id === selectedAnnotationId) {
      ctx.save()
      ctx.scale(scale, scale)
      ctx.strokeStyle = '#ff6b35'
      ctx.lineWidth = 2 / dpr
      ctx.setLineDash([6, 4])
      const { x, y, width, height, type, points } = ann
      if (type === 'pen' && points && points.length > 1) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
        for (const p of points) {
          minX = Math.min(minX, p.x)
          minY = Math.min(minY, p.y)
          maxX = Math.max(maxX, p.x)
          maxY = Math.max(maxY, p.y)
        }
        ctx.strokeRect(minX - 5, minY - 5, maxX - minX + 10, maxY - minY + 10)
      } else {
        ctx.strokeRect(x - 5, y - 5, width + 10, height + 10)
      }
      ctx.setLineDash([])
      ctx.restore()
    }
  }
}

export function drawCurrentShape(
  ctx: CanvasRenderingContext2D,
  type: AnnotationType,
  startX: number,
  startY: number,
  currentX: number,
  currentY: number,
  color: string,
  lineWidth: number,
  points: Point[],
  scale: number = 1
) {
  ctx.save()
  ctx.scale(scale, scale)

  switch (type) {
    case 'rect': {
      ctx.strokeStyle = color
      ctx.lineWidth = lineWidth
      ctx.strokeRect(startX, startY, currentX - startX, currentY - startY)
      break
    }
    case 'circle': {
      ctx.strokeStyle = color
      ctx.lineWidth = lineWidth
      const cx = (startX + currentX) / 2
      const cy = (startY + currentY) / 2
      const rx = Math.abs(currentX - startX) / 2
      const ry = Math.abs(currentY - startY) / 2
      ctx.beginPath()
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
      ctx.stroke()
      break
    }
    case 'arrow': {
      ctx.strokeStyle = color
      ctx.fillStyle = color
      ctx.lineWidth = lineWidth
      ctx.beginPath()
      ctx.moveTo(startX, startY)
      ctx.lineTo(currentX, currentY)
      ctx.stroke()
      const angle = Math.atan2(currentY - startY, currentX - startX)
      const headLen = 14
      ctx.beginPath()
      ctx.moveTo(currentX, currentY)
      ctx.lineTo(
        currentX - headLen * Math.cos(angle - Math.PI / 6),
        currentY - headLen * Math.sin(angle - Math.PI / 6)
      )
      ctx.lineTo(
        currentX - headLen * Math.cos(angle + Math.PI / 6),
        currentY - headLen * Math.sin(angle + Math.PI / 6)
      )
      ctx.closePath()
      ctx.fill()
      break
    }
    case 'mosaic': {
      ctx.fillStyle = 'rgba(128,128,128,0.3)'
      ctx.fillRect(startX, startY, currentX - startX, currentY - startY)
      ctx.strokeStyle = color
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.strokeRect(startX, startY, currentX - startX, currentY - startY)
      ctx.setLineDash([])
      break
    }
    case 'pen': {
      if (points.length > 1) {
        ctx.strokeStyle = color
        ctx.lineWidth = lineWidth
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.beginPath()
        ctx.moveTo(points[0].x, points[0].y)
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y)
        }
        ctx.stroke()
      }
      break
    }
  }

  ctx.restore()
}

type AnnotationType = Annotation['type']

export function applyMosaic(
  imageData: ImageData,
  x: number,
  y: number,
  w: number,
  h: number,
  blockSize: number = 10
): ImageData {
  const data = new Uint8ClampedArray(imageData.data)
  const imgW = imageData.width

  const clampedX = Math.max(0, Math.floor(x))
  const clampedY = Math.max(0, Math.floor(y))
  const clampedW = Math.min(Math.floor(w), imgW - clampedX)
  const clampedH = Math.min(Math.floor(h), imageData.height - clampedY)

  for (let by = clampedY; by < clampedY + clampedH; by += blockSize) {
    for (let bx = clampedX; bx < clampedX + clampedW; bx += blockSize) {
      let r = 0, g = 0, b = 0, count = 0
      for (let dy = 0; dy < blockSize && by + dy < clampedY + clampedH; dy++) {
        for (let dx = 0; dx < blockSize && bx + dx < clampedX + clampedW; dx++) {
          const idx = ((by + dy) * imgW + (bx + dx)) * 4
          r += data[idx]
          g += data[idx + 1]
          b += data[idx + 2]
          count++
        }
      }
      r = Math.round(r / count)
      g = Math.round(g / count)
      b = Math.round(b / count)
      for (let dy = 0; dy < blockSize && by + dy < clampedY + clampedH; dy++) {
        for (let dx = 0; dx < blockSize && bx + dx < clampedX + clampedW; dx++) {
          const idx = ((by + dy) * imgW + (bx + dx)) * 4
          data[idx] = r
          data[idx + 1] = g
          data[idx + 2] = b
        }
      }
    }
  }

  return new ImageData(data, imageData.width, imageData.height)
}

export function exportToPng(
  screenshotDataUrl: string,
  annotations: Annotation[],
  scale: number = 1
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)

      const mosaicAnnotations = annotations.filter((a) => a.type === 'mosaic')
      const otherAnnotations = annotations.filter((a) => a.type !== 'mosaic')

      for (const mosaic of mosaicAnnotations) {
        try {
          const imageData = ctx.getImageData(
            Math.max(0, Math.floor(mosaic.x)),
            Math.max(0, Math.floor(mosaic.y)),
            Math.min(Math.abs(mosaic.width), canvas.width - Math.floor(mosaic.x)),
            Math.min(Math.abs(mosaic.height), canvas.height - Math.floor(mosaic.y))
          )
          const pixelated = applyMosaic(imageData, 0, 0, imageData.width, imageData.height)
          ctx.putImageData(pixelated, Math.max(0, Math.floor(mosaic.x)), Math.max(0, Math.floor(mosaic.y)))
        } catch {
          // ignore CORS errors
        }
      }

      for (const ann of otherAnnotations) {
        drawAnnotation(ctx, ann, scale)
      }
      resolve(canvas.toDataURL('image/png'))
    }
    img.src = screenshotDataUrl
  })
}

export function exportToJson(annotations: Annotation[]): string {
  return JSON.stringify(annotations, null, 2)
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  a.click()
}

export function downloadText(text: string, filename: string, mimeType: string = 'application/json') {
  const blob = new Blob([text], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
