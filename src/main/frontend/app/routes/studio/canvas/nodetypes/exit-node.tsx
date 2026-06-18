import { Handle, type Node, type NodeProps, NodeResizeControl, Position, useStore } from '@xyflow/react'
import { ResizeIcon } from '~/routes/studio/canvas/nodetypes/frank-node'
import { FlowConfig } from '~/routes/studio/canvas/flow.config'
import { useSettingsStore } from '~/stores/settings-store'
import ZoomedOutNode from './zoomed-out-node'

export type ExitNode = Node<{
  subtype: string
  type: string
  name: string
  attributes: Record<string, string>
}>

export default function ExitNodeComponent(properties: NodeProps<ExitNode>) {
  const minNodeWidth = FlowConfig.EXIT_DEFAULT_WIDTH
  const minNodeHeight = FlowConfig.EXIT_DEFAULT_HEIGHT
  const gradientEnabled = useSettingsStore((state) => state.studio.gradient)
  const zoom = useStore((state) => state.transform[2])
  const isCompact = zoom < 0.4

  if (isCompact) {
    return (
      <ZoomedOutNode
        subtype={properties.data.subtype}
        name={properties.data.name}
        attributes={properties.data.attributes}
        colorVariable="--type-exit"
        selected={properties.selected}
      />
    )
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
          maxWidth: `${FlowConfig.NODE_MAX_WIDTH}px`,
        }}
      >
        <div
          className="border-b-border box-border w-full min-w-0 rounded-t-md border-b p-1"
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
