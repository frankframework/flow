import { BaseEdge, EdgeLabelRenderer, getBezierPath, type Position, useReactFlow, useStore } from '@xyflow/react'
import { type JSX, type MouseEvent, useEffect, useRef, useState } from 'react'
import useFlowStore from '~/stores/flow-store'
import { FlowConfig, getCompactLabelScale } from '~/routes/studio/canvas/flow.config'
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
  data?: { label?: string; faded?: boolean }
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
  data,
}: Readonly<FrankEdgeProperties>): JSX.Element {
  const deleteEdge = useFlowStore((state): ((edgeId: string) => void) => state.deleteEdge)
  const faded = data?.faded ?? false
  const { screenToFlowPosition } = useReactFlow()
  const [hoverLabelPosition, setHoverLabelPosition] = useState<{ x: number; y: number } | null>(null)
  const [pinnedLabelPosition, setPinnedLabelPosition] = useState<{ x: number; y: number } | null>(null)
  const pinnedLabelContainerReference = useRef<HTMLDivElement | null>(null)
  const interactionPathReference = useRef<SVGPathElement | null>(null)

  const sourceHandleType = useFlowStore((state): string => {
    const node = state.nodes.find((n): boolean => n.id === source)
    if (!node?.data) return ''

    type NodeData = {
      sourceHandles?: { type: string; index: number }[]
    }
    const typedData = node?.data as NodeData

    if (Array.isArray(typedData.sourceHandles)) {
      const sourceHandles = typedData.sourceHandles
      const handleIndex = Number(sourceHandleId)
      const matchedHandle = sourceHandles.find((h): boolean => h.index === handleIndex)
      return matchedHandle?.type?.toUpperCase() ?? ''
    }

    return ''
  })

  const zoom = useStore((state): number => state.transform[2])
  const isCompact = zoom < FlowConfig.ZOOM_THRESHOLD

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

  const updateHoverLabelPosition = (event: MouseEvent<SVGPathElement>): void => {
    setHoverLabelPosition(screenToFlowPosition({ x: event.clientX, y: event.clientY - HOVER_LABEL_CURSOR_OFFSET }))
  }

  const pinHoverLabelPosition = (event: MouseEvent<SVGPathElement>): void => {
    setPinnedLabelPosition(screenToFlowPosition({ x: event.clientX, y: event.clientY - HOVER_LABEL_CURSOR_OFFSET }))
  }

  useEffect((): (() => void) | undefined => {
    if (!pinnedLabelPosition) {
      return
    }

    const handlePointerDown = (event: PointerEvent): void => {
      const targetNode = event.target as Node | null

      if (!targetNode) return
      if (pinnedLabelContainerReference.current?.contains(targetNode)) return
      if (interactionPathReference.current?.contains(targetNode)) return

      setPinnedLabelPosition(null)
    }

    document.addEventListener('pointerdown', handlePointerDown)

    return (): void => {
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [pinnedLabelPosition])

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{ strokeWidth: 3, opacity: faded ? 0 : 1, transition: 'opacity 150ms cubic-bezier(0.4, 0, 0.2, 1)' }}
        interactionWidth={faded ? 0 : undefined}
      />
      <path
        ref={interactionPathReference}
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={HOVER_INTERACTION_WIDTH}
        style={{ pointerEvents: faded ? 'none' : 'stroke' }}
        onMouseEnter={updateHoverLabelPosition}
        onMouseMove={updateHoverLabelPosition}
        onMouseLeave={(): void => setHoverLabelPosition(null)}
        onClick={pinHoverLabelPosition}
      />
      <EdgeLabelRenderer>
        {labelPositions.map((position): JSX.Element => (
          <EdgeLabel
            key={`${position.x},${position.y}`}
            position={position}
            text={sourceHandleType}
            selected={selected}
            faded={faded}
            compactScale={isCompact ? getCompactLabelScale(zoom) : undefined}
            onDelete={(): void => deleteEdge(id)}
          />
        ))}
        {!pinnedLabelPosition && hoverLabelPosition && sourceHandleType && !faded && (
          <EdgeLabel
            compactScale={isCompact ? getCompactLabelScale(zoom) : undefined}
            position={hoverLabelPosition}
            text={sourceHandleType}
            onDelete={(): void => {
              /* empty */
            }}
          />
        )}
        {pinnedLabelPosition && sourceHandleType && !faded && (
          <div ref={pinnedLabelContainerReference}>
            <EdgeLabel
              position={pinnedLabelPosition}
              compactScale={isCompact ? getCompactLabelScale(zoom) : undefined}
              text={sourceHandleType}
              selected={true}
              onDelete={(): void => deleteEdge(id)}
            />
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  )
}
