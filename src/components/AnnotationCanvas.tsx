import { useRef, useEffect, useCallback, useState } from 'react'
import { ZoomIn, ZoomOut, Maximize, Minimize } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { drawAllAnnotations, drawCurrentShape, clearOffscreenCache } from '@/utils/canvas'
import type { Point } from '@/types'

const MIN_ZOOM = 1
const MAX_ZOOM = 8
const ZOOM_STEP = 0.25
const FOCUS_RATIO = 0.8

export default function AnnotationCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const startRef = useRef({ x: 0, y: 0 })
  const penPointsRef = useRef<Point[]>([])
  const panStartRef = useRef<{ x: number; y: number; offX: number; offY: number } | null>(null)

  const [zoom, setZoom] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [isAltPressed, setIsAltPressed] = useState(false)
  const [baseFitScale, setBaseFitScale] = useState(1)
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 0, height: 0 })
  const [baseImageLoaded, setBaseImageLoaded] = useState(false)
  const [zoomMode, setZoomMode] = useState<'fit' | 'fill'>('fit')

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

  const totalScale = baseFitScale * zoom

  const renderedSize = useCallback(() => {
    return {
      width: imageNaturalSize.width * totalScale,
      height: imageNaturalSize.height * totalScale,
    }
  }, [imageNaturalSize, totalScale])

  const recalcBaseFitScale = useCallback(() => {
    const container = containerRef.current
    if (!container || !imageNaturalSize.width || !imageNaturalSize.height) return

    const cw = container.clientWidth
    const ch = container.clientHeight
    const nw = imageNaturalSize.width
    const nh = imageNaturalSize.height

    if (zoomMode === 'fit') {
      const s = Math.min(cw / nw, ch / nh)
      setBaseFitScale(s)
    } else {
      const s = Math.max(cw / nw, ch / nh)
      setBaseFitScale(s)
    }
  }, [imageNaturalSize, zoomMode])

  useEffect(() => {
    recalcBaseFitScale()
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(() => recalcBaseFitScale())
    observer.observe(container)
    return () => observer.disconnect()
  }, [recalcBaseFitScale])

  useEffect(() => {
    setCanvasScale(totalScale)
  }, [totalScale, setCanvasScale])

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

  const clampPan = useCallback((offX: number, offY: number) => {
    const container = containerRef.current
    if (!container) return { x: 0, y: 0 }

    const rs = renderedSize()
    const cw = container.clientWidth
    const ch = container.clientHeight

    const maxOffX = Math.max(0, (rs.width - cw) / 2)
    const maxOffY = Math.max(0, (rs.height - ch) / 2)

    return {
      x: Math.min(Math.max(-maxOffX, offX), maxOffX),
      y: Math.min(Math.max(-maxOffY, offY), maxOffY),
    }
  }, [renderedSize])

  useEffect(() => {
    if (!selectedAnnotationId || !containerRef.current) return

    const ann = annotations.find((a) => a.id === selectedAnnotationId)
    if (!ann) return

    let annX: number, annY: number, annW: number, annH: number

    if (ann.type === 'pen' && ann.points && ann.points.length > 1) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      for (const p of ann.points) {
        minX = Math.min(minX, p.x)
        minY = Math.min(minY, p.y)
        maxX = Math.max(maxX, p.x)
        maxY = Math.max(maxY, p.y)
      }
      annX = minX; annY = minY; annW = maxX - minX; annH = maxY - minY
    } else if (ann.type === 'text') {
      annX = ann.x; annY = ann.y - 20; annW = 100; annH = 30
    } else {
      annX = Math.min(ann.x, ann.x + ann.width)
      annY = Math.min(ann.y, ann.y + ann.height)
      annW = Math.abs(ann.width)
      annH = Math.abs(ann.height)
    }

    if (annW < 10) annW = 100
    if (annH < 10) annH = 80

    const container = containerRef.current
    const cw = container.clientWidth
    const ch = container.clientHeight

    const focusScaleW = (cw * FOCUS_RATIO) / annW
    const focusScaleH = (ch * FOCUS_RATIO) / annH
    const focusZoom = Math.min(focusScaleW, focusScaleH)

    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, focusZoom))
    setZoom(newZoom)

    requestAnimationFrame(() => {
      const actualScale = baseFitScale * newZoom
      const annCenterRenderX = (annX + annW / 2) * actualScale
      const annCenterRenderY = (annY + annH / 2) * actualScale
      const targetOffX = cw / 2 - annCenterRenderX
      const targetOffY = ch / 2 - annCenterRenderY
      const clamped = clampPan(targetOffX, targetOffY)
      setPanOffset(clamped)
    })
  }, [selectedAnnotationId, annotations, baseFitScale, clampPan])

  const handleImageLoad = useCallback(() => {
    const img = imgRef.current
    if (img) {
      setImageNaturalSize({ width: img.naturalWidth, height: img.naturalHeight })
      setBaseImageLoaded(true)
      setZoom(1)
      setPanOffset({ x: 0, y: 0 })
    }
  }, [])

  useEffect(() => {
    setBaseImageLoaded(false)
    setZoom(1)
    setPanOffset({ x: 0, y: 0 })
    if (imgRef.current) {
      clearOffscreenCache(imgRef.current)
    }
  }, [screenshotDataUrl])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) setIsAltPressed(true)
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.altKey) setIsAltPressed(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  const isOverImage = useCallback((e: React.MouseEvent): boolean => {
    const container = containerRef.current
    if (!container || !imageNaturalSize.width) return false

    const rs = renderedSize()
    const cw = container.clientWidth
    const ch = container.clientHeight
    const imgLeft = (cw - rs.width) / 2 + panOffset.x
    const imgTop = (ch - rs.height) / 2 + panOffset.y

    return (
      e.clientX - container.getBoundingClientRect().left >= imgLeft &&
      e.clientX - container.getBoundingClientRect().left <= imgLeft + rs.width &&
      e.clientY - container.getBoundingClientRect().top >= imgTop &&
      e.clientY - container.getBoundingClientRect().top <= imgTop + rs.height
    )
  }, [imageNaturalSize, renderedSize, panOffset])

  const getImageCoords = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) * (canvas.width / rect.width)
    const y = (e.clientY - rect.top) * (canvas.height / rect.height)
    return { x, y }
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setZoom((prev) => {
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
      const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev + delta))
      if (next === prev) return prev
      if (next <= 1) {
        setPanOffset({ x: 0, y: 0 })
      }
      return next
    })
  }, [])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        e.preventDefault()
        setIsPanning(true)
        panStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          offX: panOffset.x,
          offY: panOffset.y,
        }
        return
      }

      if (!activeTool || !isOverImage(e)) return

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
    [activeTool, color, lineWidth, addAnnotation, setIsDrawing, getImageCoords, isOverImage, panOffset]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning && panStartRef.current) {
        const dx = e.clientX - panStartRef.current.x
        const dy = e.clientY - panStartRef.current.y
        const clamped = clampPan(panStartRef.current.offX + dx, panStartRef.current.offY + dy)
        setPanOffset(clamped)
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
    [isPanning, isDrawing, activeTool, annotations, color, lineWidth, selectedAnnotationId, baseImageLoaded, clampPan, getImageCoords]
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
        addAnnotation({ type: 'rect', x: sx, y: sy, width: dx, height: dy, color, lineWidth, text: '', points: [] })
      } else if (activeTool === 'circle') {
        addAnnotation({ type: 'circle', x: Math.min(sx, pos.x), y: Math.min(sy, pos.y), width: Math.abs(dx), height: Math.abs(dy), color, lineWidth, text: '', points: [] })
      } else if (activeTool === 'arrow') {
        addAnnotation({ type: 'arrow', x: sx, y: sy, width: dx, height: dy, color, lineWidth, text: '', points: [] })
      } else if (activeTool === 'pen') {
        addAnnotation({ type: 'pen', x: 0, y: 0, width: 0, height: 0, color, lineWidth, text: '', points: penPointsRef.current })
        penPointsRef.current = []
      } else if (activeTool === 'mosaic') {
        const mx = Math.min(sx, pos.x)
        const my = Math.min(sy, pos.y)
        const mw = Math.abs(dx)
        const mh = Math.abs(dy)
        if (mw > 5 && mh > 5) {
          addAnnotation({ type: 'mosaic', x: mx, y: my, width: mw, height: mh, color, lineWidth, text: '', points: [] })
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

  if (!screenshotDataUrl) {
    return (
      <div className="flex items-center justify-center w-full h-full text-muted-foreground">
        请先加载截图
      </div>
    )
  }

  const rs = renderedSize()

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
      onWheel={handleWheel}
    >
      <div
        className="absolute will-change-transform"
        style={{
          width: rs.width || '100%',
          height: rs.height || '100%',
          left: `calc(50% - ${rs.width / 2}px + ${panOffset.x}px)`,
          top: `calc(50% - ${rs.height / 2}px + ${panOffset.y}px)`,
        }}
      >
        <img
          ref={imgRef}
          src={screenshotDataUrl}
          alt=""
          className="w-full h-full pointer-events-none select-none"
          style={{
            display: rs.width ? 'block' : 'none',
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
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      <div
        className="absolute bottom-3 left-3 flex items-center gap-1 px-2 py-1.5 rounded-lg bg-black/50 backdrop-blur-sm"
      >
        <button
          onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP))}
          className="p-1 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          title="缩小"
        >
          <ZoomOut size={16} />
        </button>
        <span className="text-white/60 text-xs min-w-[42px] text-center tabular-nums">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP))}
          className="p-1 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          title="放大"
        >
          <ZoomIn size={16} />
        </button>
        <div className="w-px h-4 bg-white/20 mx-1" />
        <button
          onClick={() => {
            setZoomMode('fit')
            setZoom(1)
            setPanOffset({ x: 0, y: 0 })
          }}
          className={`p-1 rounded hover:bg-white/10 transition-colors ${zoomMode === 'fit' && zoom === 1 ? 'text-[#ff6b35]' : 'text-white/70 hover:text-white'}`}
          title="适应窗口"
        >
          <Minimize size={16} />
        </button>
        <button
          onClick={() => {
            setZoomMode('fill')
            setZoom(1)
            setPanOffset({ x: 0, y: 0 })
          }}
          className={`p-1 rounded hover:bg-white/10 transition-colors ${zoomMode === 'fill' && zoom === 1 ? 'text-[#ff6b35]' : 'text-white/70 hover:text-white'}`}
          title="填充窗口"
        >
          <Maximize size={16} />
        </button>
      </div>

      <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/40 text-white/40 text-xs">
        滚轮缩放 · Alt+拖拽平移
      </div>
    </div>
  )
}
