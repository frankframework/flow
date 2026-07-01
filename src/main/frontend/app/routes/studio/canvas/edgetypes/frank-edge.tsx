import { BaseEdge, EdgeLabelRenderer, getBezierPath, type Position } from '@xyflow/react'
import useFlowStore from '~/stores/flow-store'

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
  const faded = data?.faded ?? false

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

  return (
    <>
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
      </EdgeLabelRenderer>
    </>
  )
}
