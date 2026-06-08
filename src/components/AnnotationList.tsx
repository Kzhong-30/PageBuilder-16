import { useState } from 'react'
import { Square, Circle, MoveRight, Type, Grid3x3, Pen, Trash2, MessageSquare } from 'lucide-react'
import { useStore } from '@/store/useStore'
import type { AnnotationType } from '@/types'

const typeNameMap: Record<AnnotationType, string> = {
  rect: '矩形',
  circle: '圆形',
  arrow: '箭头',
  text: '文字',
  mosaic: '马赛克',
  pen: '画笔',
}

const typeIconMap: Record<AnnotationType, React.ReactNode> = {
  rect: <Square size={16} />,
  circle: <Circle size={16} />,
  arrow: <MoveRight size={16} />,
  text: <Type size={16} />,
  mosaic: <Grid3x3 size={16} />,
  pen: <Pen size={16} />,
}

export default function AnnotationList() {
  const annotations = useStore((s) => s.annotations)
  const selectedAnnotationId = useStore((s) => s.selectedAnnotationId)
  const setSelectedAnnotationId = useStore((s) => s.setSelectedAnnotationId)
  const updateAnnotation = useStore((s) => s.updateAnnotation)
  const deleteAnnotation = useStore((s) => s.deleteAnnotation)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const handleCardClick = (id: string) => {
    setSelectedAnnotationId(id)
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    deleteAnnotation(id)
    if (editingId === id) {
      setEditingId(null)
    }
  }

  const handleStartEdit = (e: React.MouseEvent, annotation: typeof annotations[number]) => {
    e.stopPropagation()
    setEditingId(annotation.id)
    setEditValue(annotation.text || '')
  }

  const handleEditBlur = (id: string) => {
    updateAnnotation(id, { text: editValue })
    setEditingId(null)
  }

  const handleEditKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      updateAnnotation(id, { text: editValue })
      setEditingId(null)
    }
    if (e.key === 'Escape') {
      setEditingId(null)
    }
  }

  const truncate = (text: string, maxLen: number) => {
    if (text.length <= maxLen) return text
    return text.slice(0, maxLen) + '...'
  }

  return (
    <div
      style={{
        width: 280,
        height: '100%',
        backgroundColor: '#1a1a2e',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          color: '#e0e0e0',
          fontSize: 14,
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        标注列表 ({annotations.length})
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px',
        }}
      >
        {annotations.map((annotation) => {
          const isSelected = selectedAnnotationId === annotation.id
          const isEditing = editingId === annotation.id

          return (
            <div
              key={annotation.id}
              onClick={() => handleCardClick(annotation.id)}
              style={{
                backgroundColor: '#16213e',
                borderRadius: 8,
                border: `1.5px solid ${isSelected ? '#ff6b35' : 'rgba(255,255,255,0.06)'}`,
                padding: '10px 12px',
                marginBottom: 6,
                cursor: 'pointer',
                transition: 'border-color 0.15s, background-color 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = '#1a2745'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = '#16213e'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ color: '#ff6b35', display: 'flex', alignItems: 'center' }}>
                  {typeIconMap[annotation.type]}
                </span>
                <span style={{ color: '#c0c0c0', fontSize: 12, fontWeight: 500, flex: 1 }}>
                  {typeNameMap[annotation.type]}
                </span>
                <button
                  onClick={(e) => handleStartEdit(e, annotation)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.35)',
                    cursor: 'pointer',
                    padding: 2,
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#ff6b35' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)' }}
                >
                  <MessageSquare size={14} />
                </button>
                <button
                  onClick={(e) => handleDelete(e, annotation.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.35)',
                    cursor: 'pointer',
                    padding: 2,
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#ff4444' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {isEditing ? (
                <input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => handleEditBlur(annotation.id)}
                  onKeyDown={(e) => handleEditKeyDown(e, annotation.id)}
                  autoFocus
                  placeholder={annotation.type === 'text' ? '编辑文字...' : '添加描述...'}
                  style={{
                    width: '100%',
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,107,53,0.5)',
                    borderRadius: 4,
                    color: '#e0e0e0',
                    fontSize: 12,
                    padding: '4px 8px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <div
                  style={{
                    color: annotation.text ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)',
                    fontSize: 12,
                    lineHeight: 1.4,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {annotation.text ? truncate(annotation.text, 30) : (annotation.type === 'text' ? '未输入文字' : '无描述')}
                </div>
              )}
            </div>
          )
        })}

        {annotations.length === 0 && (
          <div
            style={{
              color: 'rgba(255,255,255,0.25)',
              fontSize: 13,
              textAlign: 'center',
              padding: '32px 0',
            }}
          >
            暂无标注
          </div>
        )}
      </div>
    </div>
  )
}
