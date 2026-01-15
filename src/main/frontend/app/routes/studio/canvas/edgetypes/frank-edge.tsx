import { BaseEdge, EdgeLabelRenderer, getBezierPath, type Position } from '@xyflow/react'
import useFlowStore from '~/stores/flow-store'

interface FrankEdgeProperties {
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

  const sourceHandleType = useFlowStore((state) => {
    const node = state.nodes.find((n) => n.id === source)
    if (!node?.data) return ''

    interface NodeData {
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
      <BaseEdge id={id} path={edgePath} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="flex flex-col items-center"
        >
          <p className="bg-background border-border relative rounded-md p-1 px-2 text-sm">
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
