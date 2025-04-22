import {
  Handle,
  type Node,
  type NodeProps,
  NodeResizeControl,
  Position,
  useReactFlow,
  useUpdateNodeInternals,
} from '@xyflow/react'
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import useFlowStore from '~/stores/flow-store'
import { CustomHandle } from '~/components/flow/handle'
import { FlowConfig } from '~/routes/builder/canvas/flow.config'

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
  sourceHandles: { type: string; index: number }[]
  attributes?: Record<string, string>
  children: ChildNode[]
}>

export default function FrankNode(properties: NodeProps<FrankNode>) {
  const minNodeWidth = FlowConfig.NODE_DEFAULT_WIDTH
  const minNodeHeight = FlowConfig.NODE_DEFAULT_HEIGHT
  const type = properties.data.type.toLowerCase()
  const colorVariable = `--type-${type}`
  const handleSpacing = 20
  const containerReference = useRef<HTMLDivElement>(null)

  const updateNodeInternals = useUpdateNodeInternals()

  const reactFlow = useReactFlow()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 })
  const [contentHeight, setContentHeight] = useState(minNodeHeight)
  const [dimensions, setDimensions] = useState({
    width: minNodeWidth, // Initial width
    height: minNodeHeight, // Initial height
  })

  const firstHandlePosition = useMemo(() => {
    return (dimensions.height - (properties.data.sourceHandles.length - 1) * handleSpacing) / 2
  }, [dimensions.height, properties.data.sourceHandles.length])

  useLayoutEffect(() => {
    if (containerReference.current) {
      const measuredHeight = containerReference.current.offsetHeight
      setContentHeight(Math.max(minNodeHeight, measuredHeight))
      setDimensions((previous) => ({ ...previous, height: measuredHeight }))
    }
  }, [properties.data.children, properties.data.sourceHandles.length]) // Re-measure when children change

  const addHandle = useFlowStore.getState().addHandle

  const handleMenuClick = useCallback(
    (handleType: string) => {
      addHandle(properties.id, {
        type: handleType,
        index: properties.data.sourceHandles.length + 1,
      })
      updateNodeInternals(properties.id) // Update the edge
      setIsMenuOpen(false) // Close the menu after selection
    },
    [properties.id, properties.data.sourceHandles.length],
  )

  const toggleMenu = (event: React.MouseEvent) => {
    const { clientX, clientY } = event
    const { screenToFlowPosition } = reactFlow
    const flowPosition = screenToFlowPosition({ x: clientX, y: clientY })
    const adjustedX = flowPosition.x - properties.positionAbsoluteX
    const adjustedY = flowPosition.y - properties.positionAbsoluteY

    setMenuPosition({ x: adjustedX, y: adjustedY })
    setIsMenuOpen(!isMenuOpen)
  }

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
              var(${colorVariable}) 0%,
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
            <div key={key} className="my-1 w-full max-w-full px-1">
              <p className="overflow-hidden text-sm overflow-ellipsis whitespace-nowrap text-gray-500">{key}</p>
              <p className="overflow-hidden text-sm overflow-ellipsis whitespace-nowrap">{value}</p>
            </div>
          ))}
        {properties.data.children.length > 0 && (
          <div className="w-full p-4">
            <div className="w-full rounded-md border-gray-200 bg-white p-4 shadow-[inset_0px_2px_4px_rgba(0,0,0,0.1)]">
              {properties.data.children.map((child) => (
                <div
                  key={child.type}
                  className="mb-1 max-w-max rounded-md border-1 border-gray-200 bg-white"
                  style={{ minHeight: `${minNodeHeight / 2}px` }}
                >
                  <div
                    className="box-border w-full rounded-t-md p-1"
                    style={{
                      background: `radial-gradient(
                      ellipse at top left,
                      var(--type-${child.type?.toLowerCase?.() || 'default'}) 0%,
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
                      <div key={key} className="my-1 px-1">
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
          left: '-15px',
          width: '15px',
          height: '15px',
          backgroundColor: '#B2B2B2',
        }}
      >
        {/* Use inline styling to prevent ReactFlow override on certain properties */}
      </Handle>
      {properties.data.sourceHandles.map((handle) => (
        <CustomHandle
          key={handle.type + handle.index}
          type={handle.type}
          index={handle.index}
          firstHandlePosition={firstHandlePosition}
          handleSpacing={handleSpacing}
        />
      ))}
      <div
        onClick={(event) => {
          toggleMenu(event)
        }}
        className="absolute right-[-23px] h-[15px] w-[15px] cursor-pointer justify-center rounded-full border bg-gray-400 text-center text-[8px] font-bold text-white"
        style={{
          top: `${firstHandlePosition + properties.data.sourceHandles.length * handleSpacing + handleSpacing}px`,
        }}
      >
        +
      </div>
      {isMenuOpen && (
        <div
          className="absolute rounded-md border bg-white shadow-md"
          style={{
            left: `${menuPosition.x + 10}px`, // Positioning to the right of the cursor
            top: `${menuPosition.y}px`,
          }}
        >
          <ul>
            <li
              className="cursor-pointer rounded-t-md p-2 hover:bg-gray-200"
              onClick={() => handleMenuClick('success')}
            >
              Success
            </li>
            <li className="cursor-pointer p-2 hover:bg-gray-200" onClick={() => handleMenuClick('failure')}>
              Failure
            </li>
            <li className="cursor-pointer p-2 hover:bg-gray-200" onClick={() => handleMenuClick('exception')}>
              Exception
            </li>
            <li className="cursor-pointer rounded-b-md p-2 hover:bg-gray-200" onClick={() => handleMenuClick('custom')}>
              Custom
            </li>
          </ul>
        </div>
      )}
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
