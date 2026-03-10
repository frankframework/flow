import { Handle, type Node, type NodeProps, NodeResizeControl, Position } from '@xyflow/react'
import { ResizeIcon } from '~/routes/studio/canvas/nodetypes/frank-node'
import { FlowConfig } from '~/routes/studio/canvas/flow.config'
import useNodeContextStore from '~/stores/node-context-store'
import { useNodeContextMenu } from '~/routes/studio/canvas/node-context-menu-context'
import { useSettingsStore } from '~/stores/settings-store'
import { useFFDoc } from '@frankframework/doc-library-react'
import type { Attribute } from '@frankframework/doc-library-core'

export type ExitNode = Node<{
  subtype: string
  type: string
  name: string
  attributes: Record<string, string>
}>

export default function ExitNodeComponent(properties: NodeProps<ExitNode>) {
  const minNodeWidth = FlowConfig.EXIT_DEFAULT_WIDTH
  const minNodeHeight = FlowConfig.EXIT_DEFAULT_HEIGHT
  const showNodeContextMenu = useNodeContextMenu()
  const { elements } = useFFDoc()
  const { setNodeId, setAttributes, setIsEditing, setEditingSubtype, setParentId, setChildParentId } =
    useNodeContextStore()
  const gradientEnabled = useSettingsStore((state) => state.studio.gradient)

  const editNode = () => {
    interface ElementWithAttributes {
      name: string
      attributes?: Record<string, Attribute>
    }
    const recordElements = elements as Record<string, ElementWithAttributes>
    const attributes = Object.values(recordElements).find(
      (element) => element.name === properties.data.subtype,
    )?.attributes
    setParentId(null)
    setChildParentId(null)
    setNodeId(+properties.id)
    setAttributes(attributes)
    setEditingSubtype(properties.data.subtype)
    showNodeContextMenu(true)
    setIsEditing(true)
  }

  return (
    <>
      <NodeResizeControl
        minWidth={minNodeWidth}
        minHeight={minNodeHeight}
        style={{
          background: 'transparent',
          border: 'none',
        }}
      >
        {' '}
        {/* Use inline styling to prevent ReactFlow override on certain properties */}
        <ResizeIcon />
      </NodeResizeControl>
      <div
        className={`bg-background flex h-full w-full flex-col items-center rounded-md border ${
          properties.selected ? 'border-blue-500' : 'border-border'
        }`}
        style={{
          minHeight: `${minNodeHeight}px`,
          minWidth: `${minNodeWidth}px`,
        }}
        onDoubleClick={editNode}
      >
        <div
          className="border-b-border box-border w-full rounded-t-md border-b p-1"
          style={{
            background: gradientEnabled
              ? `radial-gradient(
                ellipse farthest-corner at 20% 20%,
                var(--type-exit) 0%,
                var(--color-background) 100%
              )`
              : `var(--type-exit)`,
          }}
        >
          <h1 className="font-bold">{properties.data.subtype}</h1>
          <p className="overflow-hidden text-sm overflow-ellipsis whitespace-nowrap">{properties.data.name}</p>
        </div>
      </div>
      <Handle
        type="target"
        position={Position.Left}
        className="flex items-center justify-center text-white"
        style={{
          left: '-15px',
          width: '15px',
          height: '15px',
          backgroundColor: '#B2B2B2',
        }}
      />
    </>
  )
}
