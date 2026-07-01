import { BaseEdge, EdgeLabelRenderer, getBezierPath, type Position } from '@xyflow/react'
import useFlowStore from '~/stores/flow-store'
import { getEdgeLabelPositions } from '~/utils/edge-label-utils'
import EdgeLabel from './edge-label'

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

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={{ strokeWidth: 3 }} />
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
      </EdgeLabelRenderer>
    </>
  )
}
