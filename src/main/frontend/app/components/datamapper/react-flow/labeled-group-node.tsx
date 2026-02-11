import { Handle, Position } from '@xyflow/react'
import type { CustomNodeData } from '~/types/datamapper_types/node-types'
import { GROUP_WIDTH } from '~/utils/datamapper_utils/const'
import HighlightButton from '../basic-components/highlight-button'
import EditButton from '../basic-components/edit-button'
import DeleteButton from '../basic-components/delete-button'

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
          <HighlightButton
            onClick={() => {
              onHighlight?.(id)
            }}
          />

          <EditButton
            onClick={() => {
              onEdit?.(data)
            }}
          />

          <DeleteButton
            onClick={() => {
              onDelete?.(id)
            }}
          />
        </div>
      </div>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  )
}
export default LabeledGroupNode
