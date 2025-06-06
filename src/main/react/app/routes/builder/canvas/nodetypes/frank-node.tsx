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
import { useNodeContextMenu } from '~/routes/builder/canvas/flow'
import useNodeContextStore from '~/stores/node-context-store'
import useFrankDocStore from '~/stores/frank-doc-store'

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
  const showNodeContextMenu = useNodeContextMenu()
  const { frankDocRaw } = useFrankDocStore()
  const { setNodeId, setAttributes } = useNodeContextStore()

  const updateNodeInternals = useUpdateNodeInternals()

  const reactFlow = useReactFlow()
  const [isHandleMenuOpen, setIsHandleMenuOpen] = useState(false)
  const [handleMenuPosition, setHandleMenuPosition] = useState({ x: 0, y: 0 })
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false)
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
      setIsHandleMenuOpen(false) // Close the menu after selection
    },
    [properties.id, properties.data.sourceHandles.length],
  )

  const toggleHandleMenu = (event: React.MouseEvent) => {
    const { clientX, clientY } = event
    const { screenToFlowPosition } = reactFlow
    const flowPosition = screenToFlowPosition({ x: clientX, y: clientY })
    const adjustedX = flowPosition.x - properties.positionAbsoluteX
    const adjustedY = flowPosition.y - properties.positionAbsoluteY

    setHandleMenuPosition({ x: adjustedX, y: adjustedY })
    setIsHandleMenuOpen(!isHandleMenuOpen)
  }

  const toggleContextMenu = () => {
    setIsContextMenuOpen(!isContextMenuOpen)
  }

  const deleteNode = () => {
    useFlowStore.getState().deleteNode(properties.id)
  }

  const editNode = () => {
    const elements = frankDocRaw.elements as Record<string, { name: string; [key: string]: any }>
    const attributes = Object.values(elements).find((element) => element.name === properties.data.subtype)?.attributes
    setNodeId(+properties.id)
    setAttributes(attributes)
    showNodeContextMenu(true)
    setIsContextMenuOpen(false)
  }

  const changeHandleType = (handleIndex: number, newType: string) => {
    useFlowStore.getState().updateHandle(properties.id, handleIndex, { type: newType, index: handleIndex })
    // Timeout to prevent bug from edgelabel not properly updating
    setTimeout(() => {
      updateNodeInternals(properties.id)
    }, 0)
  }

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
        className={`flex h-full w-full flex-col items-center rounded-md bg-background ${
          properties.selected ? 'border-2 border-black' : 'border-border border'
        }`}
        style={{
          minHeight: `${minNodeHeight}px`,
          minWidth: `${minNodeWidth}px`,
        }}
        ref={containerReference}
      >
        <div className="nodrag absolute right-0 px-2 hover:cursor-pointer hover:opacity-50" onClick={toggleContextMenu}>
          <MeatballMenu />
        </div>
        {isContextMenuOpen && (
          <div
            className="nodrag absolute rounded-md border bg-background shadow-md"
            style={{
              left: 'calc(100% + 10px)',
              top: '0',
              zIndex: 100,
            }}
          >
            <button
              className="border-border absolute -top-1 -right-1 rounded-full border bg-background text-gray-400 shadow-sm hover:border-red-400 hover:text-red-400"
              onClick={() => setIsContextMenuOpen(false)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3 w-3"
                width="10"
                height="10"
                viewBox="0 0 10 10"
                strokeWidth="1"
                stroke="currentColor"
                strokeLinecap="round"
              >
                <line x1="3" y1="3" x2="7" y2="7" />
                <line x1="3" y1="7" x2="7" y2="3" />
              </svg>
            </button>
            <ul>
              <li className="hover:bg-border cursor-pointer rounded-t-md p-2" onClick={editNode}>
                Edit
              </li>
              <li className="hover:bg-border cursor-pointer rounded-b-md p-2" onClick={deleteNode}>
                Delete
              </li>
            </ul>
          </div>
        )}
        <div
          className="border-b-border box-border w-full rounded-t-md border-b p-1"
          style={{
            background: `radial-gradient(
                  ellipse farthest-corner at 20% 20%,
                  var(${colorVariable}) 0%,
                  var(--color-background) 100%
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
              <p className="text-gray-1000 overflow-hidden text-sm overflow-ellipsis whitespace-nowrap">{key}</p>
              <p className="overflow-hidden text-sm overflow-ellipsis whitespace-nowrap">{value}</p>
            </div>
          ))}
        {properties.data.children.length > 0 && (
          <div className="w-full p-4">
            <div className="border-border w-full rounded-md bg-background p-4 shadow-[inset_0px_2px_4px_rgba(0,0,0,0.1)]">
              {properties.data.children.map((child, index) => (
                <div
                  key={child.type + index.toString()}
                  className="border-border mb-1 max-w-max rounded-md border-1 bg-background"
                  style={{ minHeight: `${minNodeHeight / 2}px` }}
                >
                  <div
                    className="border-b-border box-border w-full rounded-t-md border-b p-1"
                    style={{
                      background: `radial-gradient(
                        ellipse farthest-corner at 20% 20%,
                        var(--type-${child.type?.toLowerCase?.() || 'default'}) 0%,
                        var(--color-background) 100%
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
                        <p className="text-gray-1000 overflow-hidden text-sm overflow-ellipsis whitespace-nowrap">
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
          onChangeType={(newType) => changeHandleType(handle.index, newType)}
          absolutePosition={{ x: properties.positionAbsoluteX, y: properties.positionAbsoluteY }}
        />
      ))}
      <div
        onClick={(event) => {
          toggleHandleMenu(event)
        }}
        className="nodrag absolute right-[-23px] h-[15px] w-[15px] cursor-pointer justify-center rounded-full border bg-gray-400 text-center text-[8px] font-bold text-white"
        style={{
          top: `${firstHandlePosition + properties.data.sourceHandles.length * handleSpacing + handleSpacing}px`,
        }}
      >
        +
      </div>
      {isHandleMenuOpen && (
        <div
          className="nodrag absolute rounded-md border bg-background shadow-md"
          style={{
            left: `${handleMenuPosition.x + 10}px`, // Positioning to the right of the cursor
            top: `${handleMenuPosition.y}px`,
          }}
        >
          <ul>
            <button
              className="border-border absolute -top-1 -right-1 rounded-full border bg-background text-gray-400 shadow-sm hover:border-red-400 hover:text-red-400"
              onClick={() => setIsHandleMenuOpen(false)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3 w-3"
                width="10"
                height="10"
                viewBox="0 0 10 10"
                strokeWidth="1"
                stroke="currentColor"
                strokeLinecap="round"
              >
                <line x1="3" y1="3" x2="7" y2="7" />
                <line x1="3" y1="7" x2="7" y2="3" />
              </svg>
            </button>
            <li className="hover:bg-border cursor-pointer rounded-t-md p-2" onClick={() => handleMenuClick('success')}>
              Success
            </li>
            <li className="hover:bg-border cursor-pointer p-2" onClick={() => handleMenuClick('failure')}>
              Failure
            </li>
            <li className="hover:bg-border cursor-pointer p-2" onClick={() => handleMenuClick('exception')}>
              Exception
            </li>
            <li className="hover:bg-border cursor-pointer rounded-b-md p-2" onClick={() => handleMenuClick('custom')}>
              Custom
            </li>
          </ul>
        </div>
      )}
    </>
  )
}

export function ResizeIcon({ color = '#999999' }: Readonly<{ color?: string }>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      strokeWidth="1"
      stroke={color}
      strokeLinecap="round"
      className={'absolute right-[5px] bottom-[5px]'}
    >
      <line x1="19" y1="20" x2="20" y2="19" />
      <line x1="14" y1="20" x2="20" y2="14" />
      <line x1="9" y1="20" x2="20" y2="9" />
    </svg>
  )
}

export function MeatballMenu() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
      <circle cx="6" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="18" cy="12" r="1.5" />
    </svg>
  )
}
