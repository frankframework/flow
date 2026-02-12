import { Handle, Position } from '@xyflow/react'
import type { MappingConfig } from '~/types/datamapper_types/node-types'

export interface MappingNodeProperties {
  id: string
  data: MappingConfig

  onClick?: (id: string) => void
  onDelete?: (id: string) => void
  onEdit?: (data: MappingConfig) => void
}

function MappingNode({ id, data, onClick, onDelete, onEdit }: MappingNodeProperties) {
  return (
    <div
      onClick={() => onClick?.(id)}
      className="relative flex w-[100px] flex-col gap-1 rounded-md p-2"
      style={{
        backgroundColor: data.colour || 'var(--color-backdrop)', //Tailwind needs to have predefined styles at build time, so it can generate the required CSS for it. Because the color value is set dynamically, it needs to be set with inline style
      }}
    >
      <div className="text-sm">{data.type}</div>

      {/* Delete */}
      <button
        className="text-l text-error absolute right-0 bottom-0 px-1 font-bold drop-shadow-[0_0_1px_black] hover:opacity-80"
        onClick={(event) => {
          event.stopPropagation()
          onDelete?.(id)
        }}
      >
        &times;
      </button>

      {/* Edit */}
      <button
        className="absolute top-0 right-0 px-1 text-xs font-bold hover:opacity-80"
        onClick={(event) => {
          event.stopPropagation()
          onEdit?.(data)
        }}
      >
        ✏️
      </button>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={false}
        className="pointer-events-none h-0 w-0 translate-x-[5px] opacity-0"
      />

      <Handle
        type="source"
        position={Position.Right}
        isConnectable={false}
        className="pointer-events-none h-0 w-0 -translate-x-[5px] opacity-0"
      />
    </div>
  )
}

export default MappingNode
