import { Handle, Position, type Node, useNodeConnections } from '@xyflow/react'

import clsx from 'clsx'
import type { CustomNodeData } from '~/types/datamapper_types/node-types'
import { PROPERTY_WIDTH } from '~/utils/datamapper_utils/const'

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

  const updateChecked = (newChecked: boolean) => {
    data.setNodes?.((nodes: Node[]) =>
      nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, checked: newChecked } } : n)),
    )
    if (variant != 'source') {
      data.setNodes?.((nodes: Node[]) =>
        nodes.map((n) =>
          n.id !== id && n.parentId?.includes('target') ? { ...n, data: { ...n.data, checked: false } } : n,
        ),
      )
    }
  }

  return (
    <div
      onClick={(e) => {
        e.preventDefault()
        updateChecked(!checked)
      }}
      className={clsx(
        'border-border flex cursor-pointer flex-row gap-1 rounded-md border p-2',
        checked ? 'bg-foreground-active text-[var(--color-neutral-900)]' : 'bg-backdrop',
      )}
      style={{ width: `${PROPERTY_WIDTH}px` }}
    >
      {/* Label */}
      <div className="ml-2 text-left">{data.label}</div>

      {/* Footer */}
      <div className="mt-auto ml-auto flex items-center justify-between text-sm opacity-80">
        <span>({data.variableType})</span>

        <div className="flex gap-3">
          <button
            className="text-lg hover:opacity-70"
            onClick={(e) => {
              e.stopPropagation()
              onHighlight?.(id)
            }}
          >
            💡
          </button>

          <button
            className="text-lg hover:opacity-70"
            onClick={(e) => {
              e.stopPropagation()
              onEdit?.(data)
            }}
          >
            ✏️
          </button>

          <button
            className="text-xl font-bold text-red-600 hover:text-red-700 hover:opacity-80"
            onClick={(e) => {
              e.stopPropagation()
              onDelete?.(id)
            }}
          >
            &times;
          </button>
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
