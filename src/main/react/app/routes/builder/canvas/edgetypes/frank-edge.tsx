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
    if (!node?.data) return

    const handles = Array.isArray((node?.data as any).sourceHandles)
    const typedData = node?.data as { sourceHandles: { type: string; index: number }[] }

    if (handles) {
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
          <p className="relative bg-white px-1 text-sm">
            {sourceHandleType}
            {selected && (
              <button
                className="absolute -top-2.5 -right-2.5 rounded-full border border-gray-300 text-gray-400 shadow-sm hover:border-red-400 hover:text-red-400"
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
