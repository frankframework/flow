import { Handle, Position, useNodeConnections, type Node } from '@xyflow/react'
import type { CustomNodeData } from '~/types/datamapper_types/react-node-types'
import { GROUP_WIDTH } from '~/utils/datamapper_utils/constant'
import HighlightButton from '../basic-components/highlight-button'
import DeleteButton from '../basic-components/delete-button'
import clsx from 'clsx'
import VariableTypeIcon from '../basic-components/variable-type-icon'

export interface ArrayGroupNodeProperties {
  id: string
  data: CustomNodeData
  variant?: 'source' | 'target'
  onDelete?: (id: string) => void
  onHighlight?: (id: string) => void
}

function ArrayGroupNode({ id, data, variant = 'source', onDelete, onHighlight }: ArrayGroupNodeProperties) {
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
        'group h-full cursor-pointer',
        checked ? 'border-foreground-active border-rounded rounded-md border-4' : 'border-none',
      )}
    >
      <div
        className="bg-selected relative flex h-full flex-col gap-1 rounded-md border border-gray-400 p-0"
        style={{ width: `${GROUP_WIDTH}px` }}
      >
        {/* Header */}
        <div className="bg-backdrop flex w-full gap-2 rounded-md px-2 py-2">
          <span className="shrink-0">
            <VariableTypeIcon variableType={data.variableType} variableTypeBasic={data.variableTypeBasic ?? ''} />
          </span>

          <div className="min-w-0 flex-1 truncate rounded-md text-left">{data.label}</div>
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

        <div className="bg-backdrop border-border absolute bottom-0 flex w-full items-center justify-between rounded-md border text-sm opacity-80">
          <span className="px-4 py-2">({data.variableType})</span>
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
          <Handle
            key={variant}
            type={variant}
            position={variant === 'source' ? Position.Right : Position.Left}
            isConnectable={isConnectable}
            style={{
              width: 10,
              height: 10,
            }} //Can't set this with tailwind for some reason
            className={`${variant == 'source' ? '' : 'translate-x-1.25'} transition-opacity ${isConnectable ? 'opacity-100' : 'opacity-0'} `}
          />
        </div>

        {/* Hidden opposite handle */}
        <Handle
          key={variant === 'source' ? 'target' : 'source'}
          type={variant === 'source' ? 'target' : 'source'}
          position={variant === 'source' ? Position.Left : Position.Right}
          className="pointer-events-none h-0 w-0 opacity-0"
        />
      </div>
    </div>
  )
}
export default ArrayGroupNode
