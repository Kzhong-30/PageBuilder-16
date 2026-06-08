import { Square, Circle, MoveRight, Type, Grid3x3, Pen, Undo2, Redo2, Download, FileJson, Columns2, Save } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { exportToPng, exportToJson, downloadDataUrl, downloadText } from '@/utils/canvas'
import type { AnnotationType } from '@/types'

const tools: { type: AnnotationType; icon: typeof Square; label: string }[] = [
  { type: 'rect', icon: Square, label: '矩形' },
  { type: 'circle', icon: Circle, label: '圆形' },
  { type: 'arrow', icon: MoveRight, label: '箭头' },
  { type: 'text', icon: Type, label: '文字标注' },
  { type: 'mosaic', icon: Grid3x3, label: '马赛克' },
  { type: 'pen', icon: Pen, label: '自由画笔' },
]

const lineWidthOptions = [1, 2, 3, 5, 8]

export default function Toolbar() {
  const activeTool = useStore((s) => s.activeTool)
  const setActiveTool = useStore((s) => s.setActiveTool)
  const color = useStore((s) => s.color)
  const setColor = useStore((s) => s.setColor)
  const lineWidth = useStore((s) => s.lineWidth)
  const setLineWidth = useStore((s) => s.setLineWidth)
  const undo = useStore((s) => s.undo)
  const redo = useStore((s) => s.redo)
  const compareMode = useStore((s) => s.compareMode)
  const setCompareMode = useStore((s) => s.setCompareMode)
  const saveProject = useStore((s) => s.saveProject)
  const screenshotDataUrl = useStore((s) => s.screenshotDataUrl)
  const originalScreenshotDataUrl = useStore((s) => s.originalScreenshotDataUrl)
  const annotations = useStore((s) => s.annotations)
  const canvasScale = useStore((s) => s.canvasScale)

  const handleExportPng = async () => {
    const dataUrl = await exportToPng(
      originalScreenshotDataUrl || screenshotDataUrl,
      annotations,
      canvasScale
    )
    downloadDataUrl(dataUrl, 'annotation.png')
  }

  const handleExportJson = () => {
    const json = exportToJson(annotations)
    downloadText(json, 'annotations.json')
  }

  return (
    <div className="flex h-12 items-center gap-1 rounded-lg bg-[#1a1a2e] px-3 shadow-lg">
      <div className="flex items-center gap-1">
        {tools.map(({ type, icon: Icon, label }) => (
          <button
            key={type}
            onClick={() => setActiveTool(activeTool === type ? null : type)}
            className={`flex h-8 w-8 items-center justify-center rounded transition-colors ${
              activeTool === type
                ? 'bg-[#ff6b35] text-white'
                : 'text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
            title={label}
          >
            <Icon size={16} />
          </button>
        ))}
      </div>

      <div className="mx-2 h-6 w-px bg-white/20" />

      <div className="flex items-center gap-2">
        <div className="relative">
          <div
            className="h-6 w-6 rounded border border-white/30 cursor-pointer"
            style={{ backgroundColor: color }}
          >
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </div>
        </div>
        <select
          value={lineWidth}
          onChange={(e) => setLineWidth(Number(e.target.value))}
          className="h-7 rounded bg-white/10 px-1 text-xs text-gray-300 outline-none"
        >
          {lineWidthOptions.map((w) => (
            <option key={w} value={w} className="bg-[#1a1a2e]">
              {w}px
            </option>
          ))}
        </select>
      </div>

      <div className="mx-2 h-6 w-px bg-white/20" />

      <div className="flex items-center gap-1">
        <button
          onClick={undo}
          className="flex h-8 w-8 items-center justify-center rounded text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
          title="撤销"
        >
          <Undo2 size={16} />
        </button>
        <button
          onClick={redo}
          className="flex h-8 w-8 items-center justify-center rounded text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
          title="重做"
        >
          <Redo2 size={16} />
        </button>
      </div>

      <div className="mx-2 h-6 w-px bg-white/20" />

      <div className="flex items-center gap-1">
        <button
          onClick={handleExportPng}
          className="flex h-8 items-center gap-1 rounded px-2 text-xs text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
          title="导出PNG"
        >
          <Download size={14} />
          <span>导出PNG</span>
        </button>
        <button
          onClick={handleExportJson}
          className="flex h-8 items-center gap-1 rounded px-2 text-xs text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
          title="导出JSON"
        >
          <FileJson size={14} />
          <span>导出JSON</span>
        </button>
      </div>

      <div className="mx-2 h-6 w-px bg-white/20" />

      <div className="flex items-center gap-1">
        <button
          onClick={() => setCompareMode(!compareMode)}
          className={`flex h-8 w-8 items-center justify-center rounded transition-colors ${
            compareMode
              ? 'bg-[#ff6b35] text-white'
              : 'text-gray-400 hover:bg-white/10 hover:text-white'
          }`}
          title="对比模式"
        >
          <Columns2 size={16} />
        </button>
        <button
          onClick={saveProject}
          className="flex h-8 items-center gap-1 rounded px-2 text-xs text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
          title="保存"
        >
          <Save size={14} />
        </button>
      </div>
    </div>
  )
}
