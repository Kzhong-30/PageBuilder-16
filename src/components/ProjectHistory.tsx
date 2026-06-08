import { useState, useRef, useEffect } from 'react'
import { Clock, Trash2, FileText } from 'lucide-react'
import { useStore } from '@/store/useStore'

export default function ProjectHistory() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const projects = useStore((s) => s.projects)
  const loadProject = useStore((s) => s.loadProject)
  const deleteProject = useStore((s) => s.deleteProject)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  function formatDate(iso: string) {
    const d = new Date(iso)
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          background: open ? '#16213e' : 'transparent',
          border: '1px solid',
          borderColor: open ? '#ff6b35' : '#333',
          borderRadius: '6px',
          color: open ? '#ff6b35' : '#ccc',
          cursor: 'pointer',
          fontSize: '13px',
          transition: 'all 0.2s',
        }}
      >
        <Clock size={14} />
        历史记录
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '6px',
            width: '300px',
            maxHeight: '400px',
            overflowY: 'auto',
            background: '#16213e',
            border: '1px solid #2a2a4a',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            zIndex: 100,
            padding: '8px',
          }}
        >
          {projects.length === 0 ? (
            <div
              style={{
                padding: '24px 0',
                textAlign: 'center',
                color: '#666',
                fontSize: '13px',
              }}
            >
              暂无历史记录
            </div>
          ) : (
            projects.map((project) => (
              <div
                key={project.id}
                onClick={() => {
                  loadProject(project.id)
                  setOpen(false)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                  background: 'transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#1a1a3e'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                <FileText size={16} style={{ color: '#888', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '13px',
                      color: '#e0e0e0',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {project.url || '本地文件'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                    {formatDate(project.updatedAt)} · {project.annotations.length} 条标注
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteProject(project.id)
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#555',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    flexShrink: 0,
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#ff4444'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#555'
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
