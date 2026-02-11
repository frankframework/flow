import { Handle, Position } from '@xyflow/react'
import type { CustomNodeData } from '~/types/datamapper_types/node-types'
import { GROUP_WIDTH } from '~/utils/datamapper_utils/const'
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
      className="bg-selected relative flex h-full flex-col gap-1 rounded-md border border-gray-400 p-0"
      style={{ width: `${GROUP_WIDTH + 30}px` }}
    >
      {/* Header */}
      <div className="w-full rounded-md bg-[var(--color-info)] px-2 py-2 text-sm font-semibold">
        {data.label ? `extra source: ${data.label}` : 'ExtraSource'}
      </div>

      <div className="border-border absolute bottom-0 flex w-full items-center justify-between rounded-md border bg-[var(--color-info)] px-4 py-2 text-sm opacity-80">
        <span>(Source )</span>
        <div className="flex gap-3">
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
