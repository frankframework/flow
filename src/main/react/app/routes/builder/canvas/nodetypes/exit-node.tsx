import { Handle, type Node, type NodeProps, NodeResizeControl, Position } from '@xyflow/react'
import { ResizeIcon } from '~/routes/builder/canvas/nodetypes/frank-node'
import { FlowConfig } from '~/routes/builder/canvas/flow.config'
import { useState } from 'react'
import { getColorFromType } from '~/routes/builder/node-translator-module'

export type ExitNode = Node<{
  subtype: string
  type: string
  name: string
}>

export default function ExitNode(properties: NodeProps<ExitNode>) {
  const minNodeWidth = FlowConfig.EXIT_DEFAULT_WIDTH
  const minNodeHeight = FlowConfig.EXIT_DEFAULT_HEIGHT

  const [dimensions, setDimensions] = useState({
    width: minNodeWidth, // Initial width
    height: minNodeHeight, // Initial height
  })

  return (
    <>
      <NodeResizeControl
        minWidth={minNodeWidth}
        minHeight={minNodeHeight}
        onResize={(event, data) => {
          setDimensions({ width: data.width, height: data.height })
        }}
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
        className="flex h-full flex-col items-center rounded-md border-1 border-gray-200 bg-white"
        style={{
          minHeight: `${minNodeHeight}px`,
          minWidth: `${minNodeWidth}px`,
          width: `${dimensions.width}px`,
        }}
      >
        <div
          className="box-border w-full rounded-t-md p-1"
          style={{
            background: `radial-gradient(
              ellipse at top left,
              ${getColorFromType(properties.data.type)} 0%,
              white 70%
            )`,
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
