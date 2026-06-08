import { create } from 'zustand'
import type { Annotation, AnnotationType, Project } from '@/types'

const STORAGE_KEY = 'screenshot-annotator-history'
const MAX_HISTORY = 50

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function loadProjects(): Project[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function saveProjects(projects: Project[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
  } catch {
    // ignore quota errors
  }
}

interface AppState {
  url: string
  htmlContent: string
  screenshotDataUrl: string
  originalScreenshotDataUrl: string
  annotations: Annotation[]
  history: Annotation[][]
  redoStack: Annotation[][]
  activeTool: AnnotationType | null
  color: string
  lineWidth: number
  compareMode: boolean
  projects: Project[]
  currentProjectId: string | null
  iframeLoaded: boolean
  isDrawing: boolean
  selectedAnnotationId: string | null
  canvasScale: number

  setUrl: (url: string) => void
  setHtmlContent: (content: string) => void
  setScreenshotDataUrl: (dataUrl: string) => void
  setOriginalScreenshotDataUrl: (dataUrl: string) => void
  setIframeLoaded: (loaded: boolean) => void
  setActiveTool: (tool: AnnotationType | null) => void
  setColor: (color: string) => void
  setLineWidth: (width: number) => void
  setCompareMode: (mode: boolean) => void
  setCanvasScale: (scale: number) => void
  setIsDrawing: (drawing: boolean) => void
  setSelectedAnnotationId: (id: string | null) => void

  addAnnotation: (annotation: Omit<Annotation, 'id' | 'createdAt'>) => void
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void
  deleteAnnotation: (id: string) => void
  undo: () => void
  redo: () => void

  saveProject: () => void
  loadProject: (id: string) => void
  deleteProject: (id: string) => void
  resetState: () => void
}

export const useStore = create<AppState>((set, get) => ({
  url: '',
  htmlContent: '',
  screenshotDataUrl: '',
  originalScreenshotDataUrl: '',
  annotations: [],
  history: [],
  redoStack: [],
  activeTool: null,
  color: '#ff6b35',
  lineWidth: 2,
  compareMode: false,
  projects: loadProjects(),
  currentProjectId: null,
  iframeLoaded: false,
  isDrawing: false,
  selectedAnnotationId: null,
  canvasScale: 1,

  setUrl: (url) => set({ url }),
  setHtmlContent: (htmlContent) => set({ htmlContent }),
  setScreenshotDataUrl: (screenshotDataUrl) => set({ screenshotDataUrl }),
  setOriginalScreenshotDataUrl: (originalScreenshotDataUrl) => set({ originalScreenshotDataUrl }),
  setIframeLoaded: (iframeLoaded) => set({ iframeLoaded }),
  setActiveTool: (activeTool) => set({ activeTool }),
  setColor: (color) => set({ color }),
  setLineWidth: (lineWidth) => set({ lineWidth }),
  setCompareMode: (compareMode) => set({ compareMode }),
  setCanvasScale: (canvasScale) => set({ canvasScale }),
  setIsDrawing: (isDrawing) => set({ isDrawing }),
  setSelectedAnnotationId: (selectedAnnotationId) => set({ selectedAnnotationId }),

  addAnnotation: (annotation) => {
    const state = get()
    const newAnnotation: Annotation = {
      ...annotation,
      id: generateId(),
      createdAt: new Date().toISOString(),
    }
    const newAnnotations = [...state.annotations, newAnnotation]
    const newHistory = [...state.history, state.annotations]
    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift()
    }
    set({
      annotations: newAnnotations,
      history: newHistory,
      redoStack: [],
    })
  },

  updateAnnotation: (id, updates) => {
    const state = get()
    const newAnnotations = state.annotations.map((a) =>
      a.id === id ? { ...a, ...updates } : a
    )
    const newHistory = [...state.history, state.annotations]
    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift()
    }
    set({
      annotations: newAnnotations,
      history: newHistory,
      redoStack: [],
    })
  },

  deleteAnnotation: (id) => {
    const state = get()
    const newAnnotations = state.annotations.filter((a) => a.id !== id)
    const newHistory = [...state.history, state.annotations]
    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift()
    }
    set({
      annotations: newAnnotations,
      history: newHistory,
      redoStack: [],
      selectedAnnotationId: state.selectedAnnotationId === id ? null : state.selectedAnnotationId,
    })
  },

  undo: () => {
    const state = get()
    if (state.history.length === 0) return
    const prev = state.history[state.history.length - 1]
    set({
      annotations: prev,
      history: state.history.slice(0, -1),
      redoStack: [...state.redoStack, state.annotations],
    })
  },

  redo: () => {
    const state = get()
    if (state.redoStack.length === 0) return
    const next = state.redoStack[state.redoStack.length - 1]
    set({
      annotations: next,
      redoStack: state.redoStack.slice(0, -1),
      history: [...state.history, state.annotations],
    })
  },

  saveProject: () => {
    const state = get()
    if (!state.screenshotDataUrl) return
    const now = new Date().toISOString()
    const project: Project = {
      id: state.currentProjectId || generateId(),
      name: state.url || '本地文件',
      url: state.url,
      htmlContent: '',
      screenshotDataUrl: state.originalScreenshotDataUrl || state.screenshotDataUrl,
      annotations: state.annotations,
      createdAt: state.currentProjectId
        ? state.projects.find((p) => p.id === state.currentProjectId)?.createdAt || now
        : now,
      updatedAt: now,
    }
    const existingIdx = state.projects.findIndex((p) => p.id === project.id)
    let newProjects: Project[]
    if (existingIdx >= 0) {
      newProjects = [...state.projects]
      newProjects[existingIdx] = project
    } else {
      newProjects = [...state.projects, project]
    }
    saveProjects(newProjects)
    set({ projects: newProjects, currentProjectId: project.id })
  },

  loadProject: (id) => {
    const state = get()
    const project = state.projects.find((p) => p.id === id)
    if (!project) return
    set({
      url: project.url,
      screenshotDataUrl: project.screenshotDataUrl,
      originalScreenshotDataUrl: project.screenshotDataUrl,
      annotations: project.annotations,
      history: [],
      redoStack: [],
      currentProjectId: project.id,
      activeTool: null,
      compareMode: false,
      selectedAnnotationId: null,
    })
  },

  deleteProject: (id) => {
    const state = get()
    const newProjects = state.projects.filter((p) => p.id !== id)
    saveProjects(newProjects)
    set({
      projects: newProjects,
      currentProjectId: state.currentProjectId === id ? null : state.currentProjectId,
    })
  },

  resetState: () => {
    set({
      url: '',
      htmlContent: '',
      screenshotDataUrl: '',
      originalScreenshotDataUrl: '',
      annotations: [],
      history: [],
      redoStack: [],
      activeTool: null,
      compareMode: false,
      currentProjectId: null,
      iframeLoaded: false,
      isDrawing: false,
      selectedAnnotationId: null,
    })
  },
}))
