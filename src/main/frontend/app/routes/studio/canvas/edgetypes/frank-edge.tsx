import { BaseEdge, EdgeLabelRenderer, getBezierPath, type Position, useReactFlow } from '@xyflow/react'
import { type MouseEvent, useEffect, useRef, useState } from 'react'
import useFlowStore from '~/stores/flow-store'
import { getEdgeLabelPositions } from '~/utils/edge-label-utils'
import EdgeLabel from './edge-label'

const HOVER_LABEL_CURSOR_OFFSET = 20
const HOVER_INTERACTION_WIDTH = 28

export type FrankEdgeProperties = {
  id: string
  source: string
  target: string
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  sourcePosition?: Position
  targetPosition?: Position
  selected?: boolean
  sourceHandleId?: string | null
  targetHandleId?: string | null
  type: string
}

export default function FrankEdge({
  id,
  source,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  sourceHandleId,
}: Readonly<FrankEdgeProperties>) {
  const deleteEdge = useFlowStore((state) => state.deleteEdge)
  const { screenToFlowPosition } = useReactFlow()
  const [hoverLabelPosition, setHoverLabelPosition] = useState<{ x: number; y: number } | null>(null)
  const [pinnedLabelPosition, setPinnedLabelPosition] = useState<{ x: number; y: number } | null>(null)
  const pinnedLabelContainerReference = useRef<HTMLDivElement | null>(null)
  const interactionPathReference = useRef<SVGPathElement | null>(null)

  const sourceHandleType = useFlowStore((state) => {
    const node = state.nodes.find((n) => n.id === source)
    if (!node?.data) return ''

    type NodeData = {
      sourceHandles?: { type: string; index: number }[]
    }
    const typedData = node?.data as NodeData

    if (Array.isArray(typedData.sourceHandles)) {
      const sourceHandles = typedData.sourceHandles
      const handleIndex = Number(sourceHandleId)
      const matchedHandle = sourceHandles.find((h) => h.index === handleIndex)
      return matchedHandle?.type?.toUpperCase() ?? ''
    }

    return ''
  })

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })

  const labelPositions = getEdgeLabelPositions(
    { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition },
    { x: labelX, y: labelY },
  )

  const updateHoverLabelPosition = (event: MouseEvent<SVGPathElement>) => {
    setHoverLabelPosition(screenToFlowPosition({ x: event.clientX, y: event.clientY - HOVER_LABEL_CURSOR_OFFSET }))
  }

  const pinHoverLabelPosition = (event: MouseEvent<SVGPathElement>) => {
    setPinnedLabelPosition(screenToFlowPosition({ x: event.clientX, y: event.clientY - HOVER_LABEL_CURSOR_OFFSET }))
  }

  useEffect(() => {
    if (!pinnedLabelPosition) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      const targetNode = event.target as Node | null

      if (!targetNode) return
      if (pinnedLabelContainerReference.current?.contains(targetNode)) return
      if (interactionPathReference.current?.contains(targetNode)) return

      setPinnedLabelPosition(null)
    }

    document.addEventListener('pointerdown', handlePointerDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [pinnedLabelPosition])

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={{ strokeWidth: 3 }} />
      <path
        ref={interactionPathReference}
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={HOVER_INTERACTION_WIDTH}
        style={{ pointerEvents: 'stroke' }}
        onMouseEnter={updateHoverLabelPosition}
        onMouseMove={updateHoverLabelPosition}
        onMouseLeave={() => setHoverLabelPosition(null)}
        onClick={pinHoverLabelPosition}
      />
      <EdgeLabelRenderer>
        {labelPositions.map((position) => (
          <EdgeLabel
            key={`${position.x},${position.y}`}
            position={position}
            text={sourceHandleType}
            selected={selected}
            onDelete={() => deleteEdge(id)}
          />
        ))}
        {!pinnedLabelPosition && hoverLabelPosition && sourceHandleType && (
          <EdgeLabel position={hoverLabelPosition} text={sourceHandleType} onDelete={() => {}} />
        )}
        {pinnedLabelPosition && sourceHandleType && (
          <div ref={pinnedLabelContainerReference}>
            <EdgeLabel
              position={pinnedLabelPosition}
              text={sourceHandleType}
              selected={true}
              onDelete={() => deleteEdge(id)}
            />
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  )
}
