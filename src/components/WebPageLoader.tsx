import { useRef, useState, useEffect } from 'react'
import html2canvas from 'html2canvas'
import { Globe, Upload, Camera, Eye, Check } from 'lucide-react'
import { useStore } from '@/store/useStore'

export default function WebPageLoader() {
  const {
    url,
    setUrl,
    htmlContent,
    setHtmlContent,
    setScreenshotDataUrl,
    setOriginalScreenshotDataUrl,
    iframeLoaded,
    setIframeLoaded,
  } = useStore()

  const [loading, setLoading] = useState(false)
  const [warning, setWarning] = useState('')
  const [mode, setMode] = useState<'none' | 'url' | 'html'>('none')
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleLoadUrl() {
    if (!url.trim()) return
    setIframeLoaded(false)
    setWarning('')
    setMode('url')
  }

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    if (mode === 'url' && url) {
      setIframeLoaded(false)
      iframe.src = url.trim()
    } else if (mode === 'html' && htmlContent) {
      setIframeLoaded(false)
      iframe.srcdoc = htmlContent
    }
  }, [mode, url, htmlContent, setIframeLoaded])

  function handleIframeLoad() {
    setIframeLoaded(true)
  }

  async function handleScreenshot() {
    setLoading(true)
    setWarning('')

    try {
      if (mode === 'html' && htmlContent) {
        await captureFromHtml(htmlContent)
      } else if (mode === 'url' && iframeRef.current) {
        try {
          const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document
          if (!iframeDoc) throw new Error('cross-origin')
          await captureFromIframe(iframeDoc)
        } catch {
          setWarning('跨域限制：无法截取跨域网页。请改用"上传HTML"功能。')
        }
      }
    } finally {
      setLoading(false)
    }
  }

  async function captureFromIframe(iframeDoc: Document) {
    const canvas = await html2canvas(iframeDoc.body, {
      useCORS: true,
      allowTaint: false,
      width: iframeDoc.body.scrollWidth,
      height: iframeDoc.body.scrollHeight,
    })
    const dataUrl = canvas.toDataURL('image/png')
    setScreenshotDataUrl(dataUrl)
    setOriginalScreenshotDataUrl(dataUrl)
  }

  async function captureFromHtml(content: string) {
    const container = document.createElement('div')
    container.style.position = 'fixed'
    container.style.left = '-9999px'
    container.style.top = '0'
    container.style.width = '1280px'
    container.style.background = '#fff'
    container.innerHTML = content
    document.body.appendChild(container)

    try {
      const canvas = await html2canvas(container, {
        useCORS: true,
        allowTaint: false,
        width: 1280,
      })
      const dataUrl = canvas.toDataURL('image/png')
      setScreenshotDataUrl(dataUrl)
      setOriginalScreenshotDataUrl(dataUrl)
    } finally {
      document.body.removeChild(container)
    }
  }

  function handleUploadClick() {
    fileInputRef.current?.click()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const text = await file.text()
    setHtmlContent(text)
    setMode('html')
    setWarning('')
    setIframeLoaded(true)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl" style={{ background: '#1a1a2e' }}>
      <div className="flex gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-lg px-3 py-2" style={{ background: '#16213e' }}>
          <Globe size={16} style={{ color: '#ff6b35' }} />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLoadUrl()}
            placeholder="输入网页地址..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-500"
            style={{ color: '#e0e0e0', fontFamily: "'DM Sans', sans-serif" }}
          />
        </div>
        <button
          onClick={handleLoadUrl}
          className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80"
          style={{ background: '#ff6b35', color: '#fff', fontFamily: "'DM Sans', sans-serif" }}
        >
          <Eye size={14} />
          预览
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleUploadClick}
          className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80"
          style={{ background: '#16213e', color: '#e0e0e0', fontFamily: "'DM Sans', sans-serif" }}
        >
          <Upload size={14} style={{ color: '#ff6b35' }} />
          上传HTML
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".html,.htm"
          onChange={handleFileChange}
          className="hidden"
        />

        <button
          onClick={handleScreenshot}
          disabled={loading || mode === 'none' || (mode === 'url' && !iframeLoaded)}
          className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: '#ff6b35', color: '#fff', fontFamily: "'DM Sans', sans-serif" }}
        >
          <Camera size={14} />
          {loading ? '截图中...' : mode === 'none' ? '请先预览' : '确认截图'}
        </button>
      </div>

      {warning && (
        <div className="rounded-lg px-3 py-2 text-xs" style={{ background: '#2a1a1a', color: '#ff6b6b', fontFamily: "'DM Sans', sans-serif" }}>
          {warning}
        </div>
      )}

      <div
        className="rounded-lg overflow-hidden border relative"
        style={{
          borderColor: '#2a2a4a',
          maxHeight: 400,
          overflow: 'auto',
          display: mode === 'none' ? 'none' : 'block',
        }}
      >
        <div
          className="sticky top-0 px-3 py-1.5 text-xs flex items-center gap-2"
          style={{ background: '#16213e', color: '#aaa', borderBottom: '1px solid #2a2a4a' }}
        >
          <Check size={12} style={{ color: '#4ade80' }} />
          <span>{mode === 'url' ? url : '本地 HTML 文件'}</span>
        </div>
        <iframe
          ref={iframeRef}
          onLoad={handleIframeLoad}
          className="w-full"
          style={{ height: 360, background: '#fff' }}
          title="page-preview"
          sandbox="allow-same-origin allow-scripts allow-forms"
        />
      </div>
    </div>
  )
}
