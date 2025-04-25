import { BaseEdge, EdgeLabelRenderer, getBezierPath, type Position, useReactFlow } from '@xyflow/react'
import { useEffect, useState } from 'react'
import useFlowStore from "~/stores/flow-store";

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
}: FrankEdgeProperties) {
  const [label, setLabel] = useState('')
  const { setEdges } = useReactFlow()
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })
  const { getNode } = useReactFlow()
  const { deleteEdge } = useFlowStore.getState()

  useEffect(() => {
    const sourceNode = getNode(source)
    if (!sourceNode || !sourceHandleId) return

    const sourceHandles = (sourceNode.data as { sourceHandles: { type: string; index: number }[] }).sourceHandles
    const sourceHandle = sourceHandles.find(
      (handle: { type: string; index: number }) => handle.index === +sourceHandleId,
    )

    if (!sourceHandle) return
    setLabel(sourceHandle.type.toUpperCase())
  }, [])

  const handleDelete = () => {
    deleteEdge(id)
  }

  return (
    <>
      <BaseEdge id={id} path={edgePath} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY - 15}px)`,
            pointerEvents: 'all',
          }}
          className="flex flex-col items-center"
        >
          <p className="bg-white px-1 text-sm">{label}</p>
          {selected && (
            <div
              className="px-2 hover:cursor-pointer hover:border-red-600 hover:text-red-600 hover:opacity-50"
              onClick={handleDelete}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" stroke="currentColor" strokeLinecap="round">
                <line x1="5" y1="5" x2="15" y2="15" />
                <line x1="5" y1="15" x2="15" y2="5" />
              </svg>
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
