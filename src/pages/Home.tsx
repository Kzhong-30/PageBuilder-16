import { useStore } from '@/store/useStore'
import WebPageLoader from '@/components/WebPageLoader'
import Toolbar from '@/components/Toolbar'
import AnnotationCanvas from '@/components/AnnotationCanvas'
import AnnotationList from '@/components/AnnotationList'
import CompareView from '@/components/CompareView'
import ProjectHistory from '@/components/ProjectHistory'
import { RotateCcw } from 'lucide-react'

export default function Home() {
  const screenshotDataUrl = useStore((s) => s.screenshotDataUrl)
  const compareMode = useStore((s) => s.compareMode)
  const resetState = useStore((s) => s.resetState)

  return (
    <div className="flex h-screen flex-col overflow-hidden" style={{ background: '#0f0f23', color: '#e0e0e0' }}>
      <header
        className="flex items-center justify-between px-4"
        style={{ height: 52, background: '#1a1a2e', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-3">
          <h1 className="text-base font-bold tracking-wide" style={{ color: '#ff6b35' }}>
            Screenshot Annotator
          </h1>
          <span className="text-xs" style={{ color: '#555' }}>
            网页截图标注工具
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ProjectHistory />
          <button
            onClick={resetState}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors hover:bg-white/10"
            style={{ color: '#888' }}
          >
            <RotateCcw size={12} />
            重置
          </button>
        </div>
      </header>

      {!screenshotDataUrl ? (
        <div className="flex flex-1 items-center justify-center">
          <div style={{ width: 560, maxWidth: '90vw' }}>
            <WebPageLoader />
          </div>
        </div>
      ) : (
        <>
          <div
            className="flex items-center gap-2 px-3 py-2"
            style={{ background: '#161630', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
          >
            <Toolbar />
          </div>

          <div className="flex flex-1 overflow-hidden">
            <div className="flex-1 overflow-hidden p-3">
              {compareMode ? <CompareView /> : <AnnotationCanvas />}
            </div>
            <AnnotationList />
          </div>
        </>
      )}
    </div>
  )
}
