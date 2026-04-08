import { Handle, Position } from '@xyflow/react'
import type { CustomNodeData } from '~/types/datamapper_types/react-node-types'
import HighlightButton from '../basic-components/highlight-button'
import DeleteButton from '../basic-components/delete-button'

export interface ExtraSourceNodeProperties {
  id: string
  data: CustomNodeData
  onDelete?: (id: string) => void
  onHighlight?: (id: string) => void
}

function ExtraSourceNode({ id, data, onDelete, onHighlight }: ExtraSourceNodeProperties) {
  return (
    <div className="group flex h-full" style={{ width: `${data.width}px` }}>
      {/* Header */}
      <div className="bg-foreground w-px self-stretch"></div>
      <div className="flex w-full rounded-md px-2 py-2 text-sm font-semibold">
        {data.label ? `extra source: ${data.label}` : 'ExtraSource'}
        <div className="hidden gap-3 group-hover:block">
          <HighlightButton
            onClick={() => {
              onHighlight?.(id)
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
export default ExtraSourceNode
