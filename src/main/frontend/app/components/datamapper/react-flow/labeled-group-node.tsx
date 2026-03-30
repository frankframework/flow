import { Handle, Position } from '@xyflow/react'
import type { CustomNodeData } from '~/types/datamapper_types/react-node-types'
import HighlightButton from '../basic-components/highlight-button'
import EditButton from '../basic-components/edit-button'
import DeleteButton from '../basic-components/delete-button'
import VariableTypeIcon from '../basic-components/variable-type-icon'

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
      className="bg-selected group relative flex h-full flex-col rounded-md border border-gray-400 p-0"
      style={{ width: `${data.width}px` }}
    >
      {/* Header */}
      <div className="bg-backdrop flex w-full gap-2 rounded-md px-2 py-2">
        <span className="shrink-0">
          <VariableTypeIcon variableType={data.variableType} variableTypeBasic={data.variableTypeBasic ?? ''} />
        </span>

        <div className="min-w-0 flex-1 truncate rounded-md text-left">{data.label}</div>
        <div className="hidden gap-3 group-hover:flex">
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

      <div className="bg-backdrop border-border absolute bottom-0 flex w-full items-center justify-between rounded-md border text-sm opacity-80">
        <span className="px-4 py-2">({data.variableType})</span>
        <div className="hidden gap-3 group-hover:flex">
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
