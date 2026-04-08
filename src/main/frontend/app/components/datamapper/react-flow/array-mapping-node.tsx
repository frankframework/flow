import { Handle, Position } from '@xyflow/react'
import type { ArrayNodeData } from '~/types/datamapper_types/react-node-types'
import DeleteButton from '../basic-components/delete-button'
import { MAPPING_WIDTH } from '~/utils/datamapper_utils/constant'

export interface ArrayMappingNodeProperties {
  id: string
  data: ArrayNodeData
  onClick?: (id: string) => void
  onDelete?: (id: string) => void
}

function ArrayMappingNode({ id, data, onClick, onDelete }: ArrayMappingNodeProperties) {
  return (
    <div
      onClick={() => onClick?.(id)}
      className={`group relative flex max-h-12.5 justify-between rounded-md p-2`}
      style={{
        backgroundColor: data.colour || 'var(--color-backdrop)',
        width: `${MAPPING_WIDTH}px`,
      }}
    >
      {/* Left: Label */}

      <div className="flex flex-1 items-center overflow-hidden">
        <div className="truncate text-xs text-white drop-shadow-sm">For each of Array </div>
      </div>

      {/* Right: Buttons (top and bottom) */}
      <div className="absolute right-0 bottom-6 z-10 hidden text-xl group-hover:block">
        <DeleteButton
          className="z-10"
          onClick={() => {
            onDelete?.(id)
          }}
        />
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={false}
        className="pointer-events-none h-0 w-0 translate-x-1.25 opacity-0"
      />
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={false}
        className="pointer-events-none h-0 w-0 -translate-x-1.25 opacity-0"
      />
    </div>
  )
}

export default ArrayMappingNode
