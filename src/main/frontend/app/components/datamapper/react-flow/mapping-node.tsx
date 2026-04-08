import { Handle, Position } from '@xyflow/react'
import type { MappingNodeData } from '~/types/datamapper_types/react-node-types'
import DeleteButton from '../basic-components/delete-button'
import EditButton from '../basic-components/edit-button'
import { MAPPING_WIDTH } from '~/utils/datamapper_utils/constant'
import HoverInfo from '../basic-components/hover-info'

export interface MappingNodeProperties {
  id: string
  data: MappingNodeData

  onClick?: (id: string) => void
  onDelete?: (id: string) => void
  onEdit?: (data: MappingNodeData) => void
}

function MappingNode({ id, data, onClick, onDelete, onEdit }: MappingNodeProperties) {
  return (
    <div
      onClick={() => onClick?.(id)}
      className={`group flex max-h-12.5 justify-between rounded-md p-2`}
      style={{
        backgroundColor: data.colour || 'var(--color-backdrop)',
        width: `${MAPPING_WIDTH}px`,
      }}
    >
      {/* Left: Label */}
      <div className="group/hoverInfoGroup flex flex-1 items-center overflow-hidden">
        <HoverInfo info={data.outputLabel ?? ''} className="-translate-x-15! -translate-y-8!" />

        <div className="truncate text-xs text-white drop-shadow-sm">{data.outputLabel}</div>
      </div>

      {/* Right: Buttons (top and bottom) */}
      <div className="absolute right-0 bottom-6 z-5 hidden text-xl group-hover:block">
        <EditButton
          className=""
          onClick={() => {
            onEdit?.(data)
          }}
        />

        <DeleteButton
          className=""
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

export default MappingNode
