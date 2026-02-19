import { Handle, Position } from '@xyflow/react'
import type { MappingConfig } from '~/types/datamapper_types/node-types'
import DeleteButton from '../basic-components/delete-button'
import EditButton from '../basic-components/edit-button'
import { MAPPING_WIDTH } from '~/utils/datamapper_utils/const'

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
      className={`relative flex max-h-[50px] justify-between overflow-hidden rounded-md p-2`}
      style={{
        backgroundColor: data.colour || 'var(--color-backdrop)',
        width: `${MAPPING_WIDTH}px`,
      }}
    >
      {/* Left: Label */}
      <div className="flex flex-1 items-center overflow-hidden">
        <div className="truncate text-xs text-white drop-shadow-sm">{data.outputLabel}</div>
      </div>

      {/* Right: Buttons (top and bottom) */}
      <div className="z-5 flex h-[25px] w-[5px] flex-col justify-between">
        <EditButton
          className="absolute right-0 bottom-5 text-sm"
          onClick={() => {
            onEdit?.(data)
          }}
        />

        <DeleteButton
          className="absolute top-4 right-0 z-4"
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
