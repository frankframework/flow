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
const DEFAULT_EDGE_CURVATURE = 0.25

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

/**
 * Builds one of the two cubic bezier control points based on where an edge leaves/enters a node.
 */
function getBezierControlPoint(
  position: CardinalPosition,
  handleX: number,
  handleY: number,
  oppositeX: number,
  oppositeY: number,
  curvature: number,
): Point {
  switch (position) {
    case 'left': {
      return { x: handleX - getBezierControlOffset(handleX - oppositeX, curvature), y: handleY }
    }
    case 'right': {
      return { x: handleX + getBezierControlOffset(oppositeX - handleX, curvature), y: handleY }
    }
    case 'top': {
      return { x: handleX, y: handleY - getBezierControlOffset(handleY - oppositeY, curvature) }
    }
    case 'bottom': {
      return { x: handleX, y: handleY + getBezierControlOffset(oppositeY - handleY, curvature) }
    }
  }
}

function getCubicBezierWeights(curveProgress: number): {
  source: number
  sourceControl: number
  targetControl: number
  target: number
} {
  const oneMinusCurveProgress = 1 - curveProgress

  return {
    source: oneMinusCurveProgress * oneMinusCurveProgress * oneMinusCurveProgress,
    sourceControl: 3 * oneMinusCurveProgress * oneMinusCurveProgress * curveProgress,
    targetControl: 3 * oneMinusCurveProgress * curveProgress * curveProgress,
    target: curveProgress * curveProgress * curveProgress,
  }
}

/**
 * Returns the exact point on the cubic bezier edge for normalized curve progress (0 = source, 1 = target).
 */
export function getPointOnBezierEdge(geometry: BezierEdgeGeometry, curveProgress: number): Point {
  const { sourceX, sourceY, targetX, targetY, curvature = DEFAULT_EDGE_CURVATURE } = geometry
  const sourcePosition = toCardinalPosition(geometry.sourcePosition, 'bottom')
  const targetPosition = toCardinalPosition(geometry.targetPosition, 'top')

  const sourceControl = getBezierControlPoint(sourcePosition, sourceX, sourceY, targetX, targetY, curvature)
  const targetControl = getBezierControlPoint(targetPosition, targetX, targetY, sourceX, sourceY, curvature)

  const weights = getCubicBezierWeights(curveProgress)

  return {
    x:
      weights.source * sourceX +
      weights.sourceControl * sourceControl.x +
      weights.targetControl * targetControl.x +
      weights.target * targetX,
    y:
      weights.source * sourceY +
      weights.sourceControl * sourceControl.y +
      weights.targetControl * targetControl.y +
      weights.target * targetY,
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

  const labelInsetProgress = Math.min(0.5, EDGE_LABEL_END_OFFSET / length)
  return [getPointOnBezierEdge(geometry, labelInsetProgress), getPointOnBezierEdge(geometry, 1 - labelInsetProgress)]
}
