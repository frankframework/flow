import { Handle, type Node, type NodeProps, NodeResizeControl, Position } from '@xyflow/react'
import { useLayoutEffect, useRef, useState } from 'react'

export interface ChildNode {
  subtype: string
  type: string
  name?: string
  attributes?: Record<string, string>
}

export type FrankNode = Node<{
  subtype: string
  type: string
  name: string
  srcHandleAmount: number
  attributes?: Record<string, string>
  children: ChildNode[]
}>

export function translateTypeToColor(type: string): string {
  switch (type.toLowerCase()) {
    case 'pipe': {
      return '#68D250'
    }
    case 'listener': {
      return '#D250BF'
    }
    case 'receiver': {
      return '#D250BF'
    }
    case 'sender': {
      return '#30CCAF'
    }
    case 'exit': {
      return '#E84E4E'
    }
    default: {
      return '#FDC300'
    }
  }
}

export default function FrankNode(properties: NodeProps<FrankNode>) {
  const minNodeWidth = 300
  const minNodeHeight = 200
  const bgColor = translateTypeToColor(properties.data.type)

  const containerReference = useRef<HTMLDivElement>(null)
  const [contentHeight, setContentHeight] = useState(minNodeHeight)
  const [dimensions, setDimensions] = useState({
    width: minNodeWidth, // Initial width
    height: minNodeHeight, // Initial height
  })

  useLayoutEffect(() => {
    if (containerReference.current) {
      const measuredHeight = containerReference.current.offsetHeight
      setContentHeight(Math.max(minNodeHeight, measuredHeight))
    }
  }, [properties.data.children]) // Re-measure when children change

  return (
    <>
      <NodeResizeControl
        minWidth={minNodeWidth}
        minHeight={contentHeight}
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
        ref={containerReference}
      >
        <div
          className="box-border w-full rounded-t-md p-1"
          style={{
            background: `radial-gradient(
              ellipse at top left,
              ${bgColor} 0%,
              white 70%
            )`,
          }}
        >
          <h1 className="font-bold">{properties.data.subtype}</h1>
          <p className="overflow-hidden text-sm tracking-wider overflow-ellipsis whitespace-nowrap">
            {properties.data.name.toUpperCase()}
          </p>
        </div>
        {properties.data.attributes &&
          Object.entries(properties.data.attributes).map(([key, value]) => (
            <div className="my-1 w-full max-w-full px-1">
              <p className="overflow-hidden text-sm overflow-ellipsis whitespace-nowrap text-gray-500">{key}</p>
              <p className="overflow-hidden text-sm overflow-ellipsis whitespace-nowrap">{value}</p>
            </div>
          ))}
        {properties.data.children.length > 0 && (
          <div className="w-full p-4">
            <div className="w-full rounded-md border-gray-200 bg-white p-4 shadow-[inset_0px_2px_4px_rgba(0,0,0,0.1)]">
              {properties.data.children.map((child) => (
                <div
                  className="mb-1 max-w-max rounded-md border-1 border-gray-200 bg-white"
                  style={{ minHeight: `${minNodeHeight / 2}px` }}
                >
                  <div
                    className="box-border w-full rounded-t-md p-1"
                    style={{
                      background: `radial-gradient(
                      ellipse at top left,
                      ${translateTypeToColor(child.type)} 0%,
                      white 70%
                    )`,
                    }}
                  >
                    <h1 className="font-bold">{child.subtype}</h1>
                    <p className="overflow-hidden text-sm tracking-wider overflow-ellipsis whitespace-nowrap">
                      {child.name?.toUpperCase()}
                    </p>
                  </div>
                  {child.attributes &&
                    Object.entries(child.attributes).map(([key, value]) => (
                      <div className="my-1 px-1">
                        <p className="overflow-hidden text-sm overflow-ellipsis whitespace-nowrap text-gray-500">
                          {key}
                        </p>
                        <p className="overflow-hidden text-sm overflow-ellipsis whitespace-nowrap">{value}</p>
                      </div>
                    ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <Handle
        type="target"
        position={Position.Left}
        className="flex items-center justify-center text-white"
        style={{
          left: '-10px',
          width: '10px',
          height: '10px',
          backgroundColor: '#3079CC',
        }}
      >
        {' '}
        {/* Use inline styling to prevent ReactFlow override on certain properties */}
        <HandleIcon />
      </Handle>
      <Handle
        key="1"
        type="source"
        position={Position.Right}
        className="flex items-center justify-center text-white"
        style={{
          right: '-10px',
          width: '10px',
          height: '10px',
          backgroundColor: '#3079CC',
        }}
      >
        {' '}
        {/* Use inline styling to prevent ReactFlow override on certain properties */}
        <HandleIcon />
      </Handle>
    </>
  )
}

export function ResizeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      strokeWidth="1"
      stroke="#999999"
      strokeLinecap="round"
      className={'absolute right-[5px] bottom-[5px]'}
    >
      <line x1="19" y1="20" x2="20" y2="19" />
      <line x1="14" y1="20" x2="20" y2="14" />
      <line x1="9" y1="20" x2="20" y2="9" />
    </svg>
  )
}

export function HandleIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ pointerEvents: 'none' }}
    >
      <polyline
        points="4,3 6,5 4,7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
