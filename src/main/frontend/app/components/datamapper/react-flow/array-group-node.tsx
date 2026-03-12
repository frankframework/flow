import { Handle, Position, useNodeConnections } from '@xyflow/react'
import type { CustomNodeData } from '~/types/datamapper_types/node-types'
import { GROUP_WIDTH } from '~/utils/datamapper_utils/const'
import HighlightButton from '../basic-components/highlight-button'
import EditButton from '../basic-components/edit-button'
import DeleteButton from '../basic-components/delete-button'

export interface ArrayGroupNodeProperties {
  id: string
  data: CustomNodeData
  variant?: 'source' | 'target'
  onEdit?: (data: CustomNodeData) => void
  onDelete?: (id: string) => void
  onHighlight?: (id: string) => void
}

function ArrayGroupNode({ id, data, variant = 'source', onEdit, onDelete, onHighlight }: ArrayGroupNodeProperties) {
  const connections = useNodeConnections({
    id,
  })

  const isConnectable = connections.length === 0 || variant === 'source'

  return (
    <div
      className="bg-selected relative flex h-full flex-col gap-1 rounded-md border border-gray-400 p-0"
      style={{ width: `${GROUP_WIDTH}px` }}
    >
      {/* Header */}
      <div className="bg-backdrop w-full rounded-md px-2 py-2 text-sm font-semibold">{data.label ?? 'Group'}</div>

      <div className="bg-backdrop border-border absolute bottom-0 flex w-full items-center justify-between rounded-md border px-4 py-2 text-sm opacity-80">
        <span>({data.variableType})</span>
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
      <Handle
        key={variant}
        type={variant}
        position={variant === 'source' ? Position.Right : Position.Left}
        isConnectable={isConnectable}
        style={{
          width: 10,
          height: 10,
        }} //Can't set this with tailwind for some reason
        className={`${variant == 'source' ? '' : 'translate-x-[5px]'} transition-opacity transition-transform ${isConnectable ? 'opacity-100' : 'opacity-0'} `}
      />

      {/* Hidden opposite handle */}
      <Handle
        key={variant === 'source' ? 'target' : 'source'}
        type={variant === 'source' ? 'target' : 'source'}
        position={variant === 'source' ? Position.Left : Position.Right}
        className="pointer-events-none h-0 w-0 opacity-0"
      />
    </div>
  )
}
export default ArrayGroupNode
