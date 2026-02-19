import { Handle, Position, type Node, useNodeConnections } from '@xyflow/react'

import clsx from 'clsx'
import type { CustomNodeData } from '~/types/datamapper_types/node-types'
import { PROPERTY_WIDTH } from '~/utils/datamapper_utils/const'
import EditButton from '../basic-components/edit-button'
import DeleteButton from '../basic-components/delete-button'
import HighlightButton from '../basic-components/highlight-button'

export interface OneEdgeNodeProperties {
  id: string
  data: CustomNodeData
  variant?: 'source' | 'target'
  onEdit?: (data: CustomNodeData) => void
  onDelete?: (id: string) => void
  onHighlight?: (id: string) => void
}

function OneEdgeNode({ id, data, variant = 'source', onEdit, onDelete, onHighlight }: OneEdgeNodeProperties) {
  const checked = data?.checked

  const connections = useNodeConnections({
    id,
  })

  const isConnectable = connections.length === 0 || variant === 'source'

  const updateChecked = () => {
    const newChecked = !checked
    data.setNodes?.((nodes: Node[]) =>
      nodes.map((node) => (node.id === id ? { ...node, data: { ...node.data, checked: newChecked } } : node)),
    )
    if (variant != 'source') {
      data.setNodes?.((nodes: Node[]) =>
        nodes.map((node) =>
          node.id !== id && node.parentId?.includes('target')
            ? { ...node, data: { ...node.data, checked: false } }
            : node,
        ),
      )
    }
  }

  return (
    <div
      onClick={updateChecked}
      className={clsx(
        'border-border flex cursor-pointer flex-row gap-1 rounded-md border p-2',
        checked ? 'bg-foreground-active text-neutral' : 'bg-backdrop',
      )}
      style={{ width: `${PROPERTY_WIDTH}px` }}
    >
      {/* Label */}
      <div className="ml-2 text-left">{data.label}</div>

      {/* Footer */}
      <div className="ml-auto flex items-center text-sm opacity-80">
        <span>({data.variableType})</span>

        <div className="ml-4 flex h-[22px] gap-3">
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

      {/* Active handle */}
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

export default OneEdgeNode
