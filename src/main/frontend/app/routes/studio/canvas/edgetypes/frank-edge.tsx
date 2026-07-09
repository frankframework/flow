<<<<<<< HEAD
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type Position, useReactFlow } from '@xyflow/react'
import { type MouseEvent, useEffect, useRef, useState } from 'react'
import useFlowStore from '~/stores/flow-store'
import { getEdgeLabelPositions } from '~/utils/edge-label-utils'
import EdgeLabel from './edge-label'

const HOVER_LABEL_CURSOR_OFFSET = 20
const HOVER_INTERACTION_WIDTH = 28
=======
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type Position, useStore } from '@xyflow/react'
import useFlowStore from '~/stores/flow-store'
import { FlowConfig, getCompactLabelScale } from '~/routes/studio/canvas/flow.config'
>>>>>>> origin/master

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
}: Readonly<FrankEdgeProperties>) {
  const deleteEdge = useFlowStore((state) => state.deleteEdge)
<<<<<<< HEAD
  const { screenToFlowPosition } = useReactFlow()
  const [hoverLabelPosition, setHoverLabelPosition] = useState<{ x: number; y: number } | null>(null)
  const [pinnedLabelPosition, setPinnedLabelPosition] = useState<{ x: number; y: number } | null>(null)
  const pinnedLabelContainerReference = useRef<HTMLDivElement | null>(null)
  const interactionPathReference = useRef<SVGPathElement | null>(null)
=======
  const faded = data?.faded ?? false
>>>>>>> origin/master

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

  const zoom = useStore((state) => state.transform[2])
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
<<<<<<< HEAD
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
=======
      <BaseEdge
        id={id}
        path={edgePath}
        style={{ strokeWidth: 3, opacity: faded ? 0 : 1, transition: 'opacity 150ms cubic-bezier(0.4, 0, 0.2, 1)' }}
        interactionWidth={faded ? 0 : undefined}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: faded ? 'none' : 'all',
            opacity: faded ? 0 : 1,
            transition: 'opacity 150ms cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: 20,
          }}
          className="nodrag flex flex-col items-center"
        >
          <div style={isCompact ? { transform: `scale(${getCompactLabelScale(zoom)})` } : undefined}>
            <p className="bg-background border-border relative rounded-md border p-1 px-2 text-sm">
              {sourceHandleType}
              {selected && (
                <button
                  className="text-foreground absolute -top-3 -right-2.5 rounded-full border border-black shadow-sm hover:border-red-400 hover:text-red-400"
                  onClick={() => deleteEdge(id)}
                >
                  <svg width="15" height="15" viewBox="0 0 15 15" stroke="currentColor" strokeLinecap="round">
                    <line x1="5" y1="5" x2="10" y2="10" />
                    <line x1="5" y1="10" x2="10" y2="5" />
                  </svg>
                </button>
              )}
            </p>
          </div>
        </div>
>>>>>>> origin/master
      </EdgeLabelRenderer>
    </>
  )
}
