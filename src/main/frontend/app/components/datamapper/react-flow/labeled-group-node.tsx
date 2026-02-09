import { Handle, Position } from '@xyflow/react'
import type { CustomNodeData } from '~/types/datamapper_types/node-types'
import { GROUP_WIDTH } from '~/utils/datamapper_utils/const'

export interface LabeledGroupNodeProperties {
  id: string
  data: CustomNodeData
  onEdit?: (data: CustomNodeData) => void
  onDelete?: (id: string) => void
  onHighlight?: (id: string) => void
}

function LabeledGroupNode({ id, data, onEdit, onDelete, onHighlight }: LabeledGroupNodeProperties) {
  return (
    <div
      className="bg-selected relative flex h-full flex-col gap-1 rounded-md border border-gray-400 p-0"
      style={{ width: `${GROUP_WIDTH}px` }}
    >
      {/* Header */}
      <div className="bg-backdrop w-full rounded-md px-2 py-2 text-sm font-semibold">{data.label ?? 'Group'}</div>

      <div className="bg-backdrop border-border absolute bottom-0 flex w-full items-center justify-between rounded-md border px-4 py-2 text-sm opacity-80">
        <span>(Object)</span>
        <div className="flex gap-3">
          <button
            className="text-lg hover:opacity-70"
            onClick={(e) => {
              e.stopPropagation()
              onHighlight?.(id)
            }}
          >
            💡
          </button>
          <button
            className="text-lg hover:opacity-70"
            onClick={(e) => {
              e.stopPropagation()
              onEdit?.(data)
            }}
          >
            ✏️
          </button>
          <button
            className="text-xl font-bold text-red-600 hover:text-red-700 hover:opacity-80"
            onClick={(e) => {
              e.stopPropagation()
              onDelete?.(id)
            }}
          >
            &times;
          </button>
        </div>
      </div>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  )
}
export default LabeledGroupNode
