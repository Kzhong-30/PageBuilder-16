import { useRef, useEffect, useCallback, useState } from 'react'
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Move } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { drawAllAnnotations, drawCurrentShape, clearOffscreenCache } from '@/utils/canvas'
import type { Point } from '@/types'

export default function AnnotationCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const startRef = useRef({ x: 0, y: 0 })
  const penPointsRef = useRef<Point[]>([])
  const panStartRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null)

  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [isAltPressed, setIsAltPressed] = useState(false)
  const [imageRect, setImageRect] = useState({ width: 0, height: 0, offsetX: 0, offsetY: 0 })
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 0, height: 0 })
  const [baseImageLoaded, setBaseImageLoaded] = useState(false)

  const screenshotDataUrl = useStore((s) => s.screenshotDataUrl)
  const annotations = useStore((s) => s.annotations)
  const activeTool = useStore((s) => s.activeTool)
  const color = useStore((s) => s.color)
  const lineWidth = useStore((s) => s.lineWidth)
  const isDrawing = useStore((s) => s.isDrawing)
  const setIsDrawing = useStore((s) => s.setIsDrawing)
  const setCanvasScale = useStore((s) => s.setCanvasScale)
  const addAnnotation = useStore((s) => s.addAnnotation)
  const selectedAnnotationId = useStore((s) => s.selectedAnnotationId)

  const getImageCoords = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) * (canvas.width / rect.width)
    const y = (e.clientY - rect.top) * (canvas.height / rect.height)
    return { x, y }
  }, [])

  const calculateRect = useCallback(() => {
    const container = containerRef.current
    if (!container || !imageNaturalSize.width || !imageNaturalSize.height) return

    const containerW = container.clientWidth
    const containerH = container.clientHeight
    const natW = imageNaturalSize.width
    const natH = imageNaturalSize.height

    const scaleW = containerW / natW
    const scaleH = containerH / natH
    const scale = Math.min(scaleW, scaleH, 1.5)

    const renderedW = natW * scale
    const renderedH = natH * scale
    const offsetX = Math.max(0, (containerW - renderedW) / 2)
    const offsetY = Math.max(0, (containerH - renderedH) / 2)

    setImageRect({ width: renderedW, height: renderedH, offsetX, offsetY })
    setCanvasScale(scale)
  }, [imageNaturalSize, setCanvasScale])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    calculateRect()

    const observer = new ResizeObserver(() => {
      calculateRect()
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [calculateRect])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !imageNaturalSize.width) return
    canvas.width = imageNaturalSize.width
    canvas.height = imageNaturalSize.height
    const ctx = canvas.getContext('2d')
    if (ctx) {
      drawAllAnnotations(ctx, annotations, 1, baseImageLoaded ? imgRef.current || undefined : undefined, selectedAnnotationId)
    }
  }, [annotations, imageNaturalSize, selectedAnnotationId, baseImageLoaded])

  const clampOffset = useCallback((offsetX: number, offsetY: number) => {
    const container = containerRef.current
    if (!container || !imageRect.width || !imageRect.height) return { x: 0, y: 0 }

    const maxOffsetX = Math.max(0, imageRect.width - container.clientWidth + imageRect.offsetX)
    const maxOffsetY = Math.max(0, imageRect.height - container.clientHeight + imageRect.offsetY)

    return {
      x: Math.min(Math.max(-maxOffsetX, offsetX), maxOffsetX),
      y: Math.min(Math.max(-maxOffsetY, offsetY), maxOffsetY),
    }
  }, [imageRect])

  useEffect(() => {
    if (!selectedAnnotationId || !containerRef.current) return

    const ann = annotations.find((a) => a.id === selectedAnnotationId)
    if (!ann) return

    const scale = imageRect.width / (imageNaturalSize.width || 1)
    let annX: number, annY: number, annW: number, annH: number

    if (ann.type === 'pen' && ann.points && ann.points.length > 1) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      for (const p of ann.points) {
        minX = Math.min(minX, p.x)
        minY = Math.min(minY, p.y)
        maxX = Math.max(maxX, p.x)
        maxY = Math.max(maxY, p.y)
      }
      annX = minX * scale
      annY = minY * scale
      annW = (maxX - minX) * scale
      annH = (maxY - minY) * scale
    } else {
      annX = Math.min(ann.x, ann.x + ann.width) * scale
      annY = Math.min(ann.y, ann.y + ann.height) * scale
      annW = Math.abs(ann.width) * scale
      annH = Math.abs(ann.height) * scale
    }

    const container = containerRef.current
    const annCenterX = annX + annW / 2 + imageRect.offsetX
    const annCenterY = annY + annH / 2 + imageRect.offsetY
    const targetX = container.clientWidth / 2 - annCenterX
    const targetY = container.clientHeight / 2 - annCenterY

    const clamped = clampOffset(targetX, targetY)
    setViewOffset(clamped)
  }, [selectedAnnotationId, annotations, imageRect, imageNaturalSize, clampOffset])

  const handleImageLoad = useCallback(() => {
    const img = imgRef.current
    if (img) {
      setImageNaturalSize({ width: img.naturalWidth, height: img.naturalHeight })
      setBaseImageLoaded(true)
      setViewOffset({ x: 0, y: 0 })
    }
  }, [])

  useEffect(() => {
    setBaseImageLoaded(false)
    setViewOffset({ x: 0, y: 0 })
    if (imgRef.current) {
      clearOffscreenCache(imgRef.current)
    }
  }, [screenshotDataUrl])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && !isAltPressed) {
        setIsAltPressed(true)
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.altKey && isAltPressed) {
        setIsAltPressed(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [isAltPressed])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        e.preventDefault()
        setIsPanning(true)
        panStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          offsetX: viewOffset.x,
          offsetY: viewOffset.y,
        }
        return
      }

      if (!activeTool) return

      const pos = getImageCoords(e)
      startRef.current = pos

      if (activeTool === 'text') {
        const text = prompt('请输入标注文字:')
        if (text) {
          addAnnotation({
            type: 'text',
            x: pos.x,
            y: pos.y,
            width: 0,
            height: 0,
            color,
            lineWidth,
            text,
            points: [],
          })
        }
        return
      }

      if (activeTool === 'pen') {
        penPointsRef.current = [pos]
      }

      setIsDrawing(true)
    },
    [activeTool, color, lineWidth, addAnnotation, setIsDrawing, getImageCoords, viewOffset]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning && panStartRef.current) {
        const dx = e.clientX - panStartRef.current.x
        const dy = e.clientY - panStartRef.current.y
        const clamped = clampOffset(panStartRef.current.offsetX + dx, panStartRef.current.offsetY + dy)
        setViewOffset(clamped)
        return
      }

      if (!isDrawing || !activeTool) return

      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const pos = getImageCoords(e)

      if (activeTool === 'pen') {
        penPointsRef.current = [...penPointsRef.current, pos]
      }

      drawAllAnnotations(ctx, annotations, 1, baseImageLoaded ? imgRef.current || undefined : undefined, selectedAnnotationId)
      drawCurrentShape(
        ctx,
        activeTool,
        startRef.current.x,
        startRef.current.y,
        pos.x,
        pos.y,
        color,
        lineWidth,
        penPointsRef.current,
        1
      )
    },
    [isPanning, isDrawing, activeTool, annotations, color, lineWidth, selectedAnnotationId, baseImageLoaded, clampOffset, getImageCoords]
  )

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        setIsPanning(false)
        panStartRef.current = null
        return
      }

      if (!isDrawing || !activeTool) return

      const pos = getImageCoords(e)
      const sx = startRef.current.x
      const sy = startRef.current.y
      const dx = pos.x - sx
      const dy = pos.y - sy

      setIsDrawing(false)

      if (activeTool === 'rect') {
        addAnnotation({
          type: 'rect',
          x: sx,
          y: sy,
          width: dx,
          height: dy,
          color,
          lineWidth,
          text: '',
          points: [],
        })
      } else if (activeTool === 'circle') {
        addAnnotation({
          type: 'circle',
          x: Math.min(sx, pos.x),
          y: Math.min(sy, pos.y),
          width: Math.abs(dx),
          height: Math.abs(dy),
          color,
          lineWidth,
          text: '',
          points: [],
        })
      } else if (activeTool === 'arrow') {
        addAnnotation({
          type: 'arrow',
          x: sx,
          y: sy,
          width: dx,
          height: dy,
          color,
          lineWidth,
          text: '',
          points: [],
        })
      } else if (activeTool === 'pen') {
        addAnnotation({
          type: 'pen',
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          color,
          lineWidth,
          text: '',
          points: penPointsRef.current,
        })
        penPointsRef.current = []
      } else if (activeTool === 'mosaic') {
        const mx = Math.min(sx, pos.x)
        const my = Math.min(sy, pos.y)
        const mw = Math.abs(dx)
        const mh = Math.abs(dy)

        if (mw > 5 && mh > 5) {
          addAnnotation({
            type: 'mosaic',
            x: mx,
            y: my,
            width: mw,
            height: mh,
            color,
            lineWidth,
            text: '',
            points: [],
          })
        }
      }
    },
    [isPanning, isDrawing, activeTool, color, lineWidth, addAnnotation, setIsDrawing, getImageCoords]
  )

  const handleMouseLeave = useCallback(() => {
    if (isDrawing) {
      setIsDrawing(false)
      penPointsRef.current = []
    }
    if (isPanning) {
      setIsPanning(false)
      panStartRef.current = null
    }
  }, [isDrawing, isPanning, setIsDrawing])

  const pan = useCallback((dir: 'up' | 'down' | 'left' | 'right') => {
    const step = 50
    setViewOffset((prev) => {
      let newX = prev.x
      let newY = prev.y
      if (dir === 'up') newY += step
      if (dir === 'down') newY -= step
      if (dir === 'left') newX += step
      if (dir === 'right') newX -= step
      return clampOffset(newX, newY)
    })
  }, [clampOffset])

  if (!screenshotDataUrl) {
    return (
      <div className="flex items-center justify-center w-full h-full text-muted-foreground">
        请先加载截图
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      style={{
        background: `
          linear-gradient(45deg, #1a1a2e 25%, transparent 25%),
          linear-gradient(-45deg, #1a1a2e 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, #1a1a2e 75%),
          linear-gradient(-45deg, transparent 75%, #1a1a2e 75%)
        `,
        backgroundSize: '20px 20px',
        backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
        cursor: isPanning ? 'grabbing' : isAltPressed ? 'grab' : activeTool ? 'crosshair' : 'default',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="absolute will-change-transform"
        style={{
          transform: `translate(${viewOffset.x}px, ${viewOffset.y}px)`,
          width: imageRect.width || '100%',
          height: imageRect.height || '100%',
          left: imageRect.offsetX || 0,
          top: imageRect.offsetY || 0,
        }}
      >
        <img
          ref={imgRef}
          src={screenshotDataUrl}
          alt=""
          className="w-full h-full object-contain pointer-events-none select-none"
          style={{
            display: imageRect.width ? 'block' : 'none',
            opacity: baseImageLoaded ? 1 : 0.5,
            transition: 'opacity 0.2s',
          }}
          draggable={false}
          onLoad={handleImageLoad}
          crossOrigin="anonymous"
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 pointer-events-none"
          style={{
            width: '100%',
            height: '100%',
          }}
        />
      </div>

      {imageRect.width > 0 && (
        <>
          <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-1">
            <button
              onClick={() => pan('up')}
              className="p-1.5 rounded-lg bg-black/40 hover:bg-black/60 text-white/70 hover:text-white transition-colors"
              title="向上移动"
            >
              <ChevronUp size={16} />
            </button>
          </div>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
            <button
              onClick={() => pan('down')}
              className="p-1.5 rounded-lg bg-black/40 hover:bg-black/60 text-white/70 hover:text-white transition-colors"
              title="向下移动"
            >
              <ChevronDown size={16} />
            </button>
          </div>
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex flex-col gap-1">
            <button
              onClick={() => pan('left')}
              className="p-1.5 rounded-lg bg-black/40 hover:bg-black/60 text-white/70 hover:text-white transition-colors"
              title="向左移动"
            >
              <ChevronLeft size={16} />
            </button>
          </div>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-1">
            <button
              onClick={() => pan('right')}
              className="p-1.5 rounded-lg bg-black/40 hover:bg-black/60 text-white/70 hover:text-white transition-colors"
              title="向右移动"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/40 text-white/50 text-xs">
            <Move size={12} />
            Alt+拖拽平移
          </div>
        </>
      )}
    </div>
  )
}
