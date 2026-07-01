export type Point = { x: number; y: number }

type CardinalPosition = 'left' | 'right' | 'top' | 'bottom'

export type BezierEdgeGeometry = {
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  sourcePosition?: string
  targetPosition?: string
  curvature?: number
}

export const SHORT_EDGE_LABEL_THRESHOLD = 600
export const EDGE_LABEL_END_OFFSET = 150

export function getEdgeLength({ sourceX, sourceY, targetX, targetY }: BezierEdgeGeometry): number {
  return Math.hypot(targetX - sourceX, targetY - sourceY)
}

function toCardinalPosition(position: string | undefined, fallback: CardinalPosition): CardinalPosition {
  return position === 'left' || position === 'right' || position === 'top' || position === 'bottom'
    ? position
    : fallback
}

function getBezierControlOffset(distance: number, curvature: number): number {
  return distance >= 0 ? 0.5 * distance : curvature * 25 * Math.sqrt(-distance)
}

function getBezierControlPoint(
  position: CardinalPosition,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  curvature: number,
): Point {
  switch (position) {
    case 'left': {
      return { x: x1 - getBezierControlOffset(x1 - x2, curvature), y: y1 }
    }
    case 'right': {
      return { x: x1 + getBezierControlOffset(x2 - x1, curvature), y: y1 }
    }
    case 'top': {
      return { x: x1, y: y1 - getBezierControlOffset(y1 - y2, curvature) }
    }
    case 'bottom': {
      return { x: x1, y: y1 + getBezierControlOffset(y2 - y1, curvature) }
    }
  }
}

export function getPointOnBezierEdge(geometry: BezierEdgeGeometry, t: number): Point {
  const { sourceX, sourceY, targetX, targetY, curvature = 0.25 } = geometry
  const sourcePosition = toCardinalPosition(geometry.sourcePosition, 'bottom')
  const targetPosition = toCardinalPosition(geometry.targetPosition, 'top')

  const sourceControl = getBezierControlPoint(sourcePosition, sourceX, sourceY, targetX, targetY, curvature)
  const targetControl = getBezierControlPoint(targetPosition, targetX, targetY, sourceX, sourceY, curvature)

  const mt = 1 - t
  const a = mt * mt * mt
  const b = 3 * mt * mt * t
  const c = 3 * mt * t * t
  const d = t * t * t

  return {
    x: a * sourceX + b * sourceControl.x + c * targetControl.x + d * targetX,
    y: a * sourceY + b * sourceControl.y + c * targetControl.y + d * targetY,
  }
}

/**
 * Decides where a forward's label(s) go. Short forwards keep a single label at `center`; longer ones
 * split into two labels sitting a fixed distance after the source circle and before the target circle,
 * so labels stay readable without pan-zooming.
 */
export function getEdgeLabelPositions(geometry: BezierEdgeGeometry, center: Point): Point[] {
  const length = getEdgeLength(geometry)

  if (length < SHORT_EDGE_LABEL_THRESHOLD) {
    return [center]
  }

  const t = Math.min(0.5, EDGE_LABEL_END_OFFSET / length)
  return [getPointOnBezierEdge(geometry, t), getPointOnBezierEdge(geometry, 1 - t)]
}
