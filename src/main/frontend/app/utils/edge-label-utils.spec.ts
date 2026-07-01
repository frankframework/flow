import {
  getEdgeLabelPositions,
  getEdgeLength,
  getPointOnBezierEdge,
  SHORT_EDGE_LABEL_THRESHOLD,
} from './edge-label-utils'

describe('getEdgeLength', () => {
  it('returns the Pythagorean distance between the handles', () => {
    expect(getEdgeLength({ sourceX: 0, sourceY: 0, targetX: 3, targetY: 4 })).toBe(5)
  })

  it('returns 0 for coincident handles', () => {
    expect(getEdgeLength({ sourceX: 10, sourceY: 20, targetX: 10, targetY: 20 })).toBe(0)
  })
})

describe('getPointOnBezierEdge', () => {
  const geometry = {
    sourceX: 0,
    sourceY: 0,
    targetX: 200,
    targetY: 0,
    sourcePosition: 'right',
    targetPosition: 'left',
  }

  it('returns the source handle at t = 0', () => {
    expect(getPointOnBezierEdge(geometry, 0)).toEqual({ x: 0, y: 0 })
  })

  it('returns the target handle at t = 1', () => {
    expect(getPointOnBezierEdge(geometry, 1)).toEqual({ x: 200, y: 0 })
  })

  it('returns the midpoint at t = 0.5 for a symmetric horizontal edge', () => {
    expect(getPointOnBezierEdge(geometry, 0.5)).toEqual({ x: 100, y: 0 })
  })
})

describe('getEdgeLabelPositions', () => {
  const horizontal = (length: number) => ({
    sourceX: 0,
    sourceY: 0,
    targetX: length,
    targetY: 0,
    sourcePosition: 'right',
    targetPosition: 'left',
  })
  const center = { x: 50, y: 50 }

  it('keeps a single centred label for forwards shorter than the threshold', () => {
    const positions = getEdgeLabelPositions(horizontal(SHORT_EDGE_LABEL_THRESHOLD - 1), center)

    expect(positions).toEqual([center])
  })

  it('splits into two labels for forwards at or above the threshold', () => {
    const length = SHORT_EDGE_LABEL_THRESHOLD + 20
    const positions = getEdgeLabelPositions(horizontal(length), center)

    expect(positions).toHaveLength(2)
    const [start, end] = positions
    expect(start.x).toBeLessThan(length / 2)
    expect(end.x).toBeGreaterThan(length / 2)
    expect(start.x + end.x).toBeCloseTo(length)
  })
})
