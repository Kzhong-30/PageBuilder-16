export type AnnotationType = 'rect' | 'circle' | 'arrow' | 'text' | 'mosaic' | 'pen'

export interface Point {
  x: number
  y: number
}

export interface Annotation {
  id: string
  type: AnnotationType
  x: number
  y: number
  width: number
  height: number
  color: string
  lineWidth: number
  text: string
  points: Point[]
  createdAt: string
}

export interface Project {
  id: string
  name: string
  url: string
  htmlContent: string
  screenshotDataUrl: string
  annotations: Annotation[]
  createdAt: string
  updatedAt: string
}
