import { Handle, type Node, type NodeProps, NodeResizeControl, Position } from '@xyflow/react'
import { ResizeIcon } from '~/routes/studio/canvas/nodetypes/frank-node'
import { FlowConfig } from '~/routes/studio/canvas/flow.config'
import useNodeContextStore from '~/stores/node-context-store'
import { useNodeContextMenu } from '~/routes/studio/canvas/flow'
import { useFFDoc } from '@frankframework/ff-doc/react'
import variables from '../../../../../environment/environment'
import { useSettingsStore } from '~/routes/settings/settings-store'

export type ExitNode = Node<{
  subtype: string
  type: string
  name: string
}>

export default function ExitNodeComponent(properties: NodeProps<ExitNode>) {
  const minNodeWidth = FlowConfig.EXIT_DEFAULT_WIDTH
  const minNodeHeight = FlowConfig.EXIT_DEFAULT_HEIGHT
  const showNodeContextMenu = useNodeContextMenu()
  const FRANK_DOC_URL = variables.frankDocJsonUrl
  const { elements } = useFFDoc(FRANK_DOC_URL)
  const { setNodeId, setAttributes, setIsEditing } = useNodeContextStore()
  const gradientEnabled = useSettingsStore((state) => state.studio.gradient)

  const editNode = () => {
    interface ElementWithAttributes {
      name: string
      attributes?: unknown
    }
    const recordElements = elements as Record<string, ElementWithAttributes>
    const attributes = Object.values(recordElements).find(
      (element) => element.name === properties.data.subtype,
    )?.attributes
    setNodeId(+properties.id)
    setAttributes(attributes)
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
        className={`bg-background flex h-full w-full flex-col items-center rounded-md ${
          properties.selected ? 'border-2 border-black' : 'border-border border'
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
          <p className="overflow-hidden text-sm tracking-wider overflow-ellipsis whitespace-nowrap">
            {properties.data.name.toUpperCase()}
          </p>
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
