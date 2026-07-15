import {
  Handle,
  type Node,
  type NodeProps,
  NodeResizeControl,
  Position,
  useStore,
  useUpdateNodeInternals,
} from '@xyflow/react'
import { useEffect } from 'react'
import { ResizeIcon } from '~/routes/studio/canvas-flow/nodetypes/frank-node'
import { FlowConfig } from '~/routes/studio/canvas-flow/flow.config'
import { useSettingsStore } from '~/stores/settings-store'
import { NodeHeader } from './components/node-header'
import ZoomedOutNode from './zoomed-out-node'

export type ExitNode = Node<{
  subtype: string
  type: string
  name: string
  attributes: Record<string, string>
  hiddenForwards?: boolean | null
}>

export default function ExitNodeComponent(properties: NodeProps<ExitNode>) {
  const minNodeWidth = FlowConfig.EXIT_DEFAULT_WIDTH
  const minNodeHeight = FlowConfig.EXIT_DEFAULT_HEIGHT
  const gradientEnabled = useSettingsStore((state) => state.studio.gradient)
  const zoom = useStore((state) => state.transform[2])
  const isCompact = zoom < FlowConfig.ZOOM_THRESHOLD
  const updateNodeInternals = useUpdateNodeInternals()

  useEffect(() => {
    updateNodeInternals(properties.id)
  }, [isCompact, properties.id, updateNodeInternals])

  if (isCompact) {
    return (
      <ZoomedOutNode subtype={properties.data.subtype} colorVariable="--type-exit" selected={properties.selected} />
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
        className={`bg-background flex h-full w-full flex-col items-center rounded-md border shadow-md ${
          properties.selected ? 'border-blue-500' : 'border-border'
        }`}
        style={{
          minHeight: `${minNodeHeight}px`,
          minWidth: `${minNodeWidth}px`,
          maxWidth: `${FlowConfig.NODE_MAX_WIDTH}px`,
        }}
      >
        <NodeHeader
          subtype={properties.data.subtype}
          name={properties.data.name}
          colorVariable="--type-exit"
          gradientEnabled={gradientEnabled}
        />
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
