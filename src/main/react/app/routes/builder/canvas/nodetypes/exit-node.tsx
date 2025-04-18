import { Handle, type NodeProps, NodeResizeControl, Position } from '@xyflow/react'
import { type FrankNode, ResizeIcon, translateTypeToColor } from '~/routes/builder/canvas/nodetypes/frank-node'

export default function ExitNode(properties: NodeProps<FrankNode>) {
  const minNodeWidth = 150
  const minNodeHeight = 100

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
        className="flex h-full flex-col items-center rounded-md border-1 border-gray-200 bg-white"
        style={{
          minHeight: `${minNodeHeight}px`,
          minWidth: `${minNodeWidth}px`,
        }}
      >
        <div
          className="box-border w-full rounded-t-md p-1"
          style={{
            background: `radial-gradient(
              ellipse at top left,
              ${translateTypeToColor(properties.data.type)} 0%,
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
