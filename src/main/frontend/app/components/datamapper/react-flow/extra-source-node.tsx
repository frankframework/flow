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
    <div
      className="bg-selected group relative flex h-full flex-col gap-1 rounded-md border border-gray-400 p-0"
      style={{ width: `${data.width}px` }}
    >
      {/* Header */}
      <div className="bg-info w-full rounded-md px-2 py-2 text-sm font-semibold">
        {data.label ? `extra source: ${data.label}` : 'ExtraSource'}
      </div>

      <div className="border-border bg-info absolute bottom-0 flex w-full items-center justify-between rounded-md border text-sm opacity-80">
        <span className="px-4 py-2">(Source )</span>
        <div className="hidden gap-3 group-hover:flex">
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
