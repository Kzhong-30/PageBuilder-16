import { useRef, useEffect, useState } from 'react'
import { useStore } from '@/store/useStore'
import { drawAllAnnotations, applyMosaic } from '@/utils/canvas'

export default function CompareView() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const originalScreenshotDataUrl = useStore((s) => s.originalScreenshotDataUrl)
  const annotations = useStore((s) => s.annotations)
  const canvasScale = useStore((s) => s.canvasScale)
  const [baseImage, setBaseImage] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    if (!originalScreenshotDataUrl) return
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => setBaseImage(img)
    img.src = originalScreenshotDataUrl
  }, [originalScreenshotDataUrl])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !baseImage) return

    canvas.width = baseImage.naturalWidth
    canvas.height = baseImage.naturalHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(baseImage, 0, 0)

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

    ctx.save()
    ctx.scale(canvasScale, canvasScale)
    drawAllAnnotations(ctx, otherAnnotations, 1)
    ctx.restore()
  }, [baseImage, annotations, canvasScale])

  return (
    <div style={{ display: 'flex', height: '100%', backgroundColor: '#1a1a2e' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 12, overflow: 'hidden' }}>
        <div style={{ color: '#ff6b35', fontSize: 14, fontWeight: 600, marginBottom: 8, textAlign: 'center' }}>
          标注前
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {originalScreenshotDataUrl && (
            <img
              src={originalScreenshotDataUrl}
              alt="标注前"
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            />
          )}
        </div>
      </div>

      <div style={{ width: 1, backgroundColor: '#2a2a4a' }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 12, overflow: 'hidden' }}>
        <div style={{ color: '#ff6b35', fontSize: 14, fontWeight: 600, marginBottom: 8, textAlign: 'center' }}>
          标注后
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <canvas
            ref={canvasRef}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        </div>
      </div>
    </div>
  )
}
