import { Handle, type Node, type NodeProps, NodeResizeControl, Position } from '@xyflow/react'
import { MeatballMenu, ResizeIcon } from '~/routes/builder/canvas/nodetypes/frank-node'
import { FlowConfig } from '~/routes/builder/canvas/flow.config'
import { useState } from 'react'
import useFlowStore from '~/stores/flow-store'
import useFrankDocStore from '~/stores/frank-doc-store'
import useNodeContextStore from '~/stores/node-context-store'
import { useNodeContextMenu } from '~/routes/builder/canvas/flow'

export type ExitNode = Node<{
  subtype: string
  type: string
  name: string
}>

export default function ExitNode(properties: NodeProps<ExitNode>) {
  const minNodeWidth = FlowConfig.EXIT_DEFAULT_WIDTH
  const minNodeHeight = FlowConfig.EXIT_DEFAULT_HEIGHT
  const showNodeContextMenu = useNodeContextMenu()
  const { frankDocRaw } = useFrankDocStore()
  const { setNodeId, setAttributes } = useNodeContextStore()

  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false)
  const [dimensions, setDimensions] = useState({
    width: minNodeWidth, // Initial width
    height: minNodeHeight, // Initial height
  })

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
        className="flex h-full w-full flex-col items-center rounded-md border-1 border-gray-200 bg-white"
        style={{
          minHeight: `${minNodeHeight}px`,
          minWidth: `${minNodeWidth}px`,
          width: `${dimensions.width}px`,
        }}
      >
        <div className="nodrag absolute right-0 px-2 hover:cursor-pointer hover:opacity-50" onClick={toggleContextMenu}>
          <MeatballMenu />
        </div>
        {isContextMenuOpen && (
          <div
            className="nodrag absolute rounded-md border bg-white shadow-md"
            style={{
              left: 'calc(100% + 10px)',
              top: '0',
              zIndex: 100,
            }}
          >
            <button
              className="absolute -top-1 -right-1 rounded-full border border-gray-300 bg-white text-gray-400 shadow-sm hover:border-red-400 hover:text-red-400"
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
              <li className="cursor-pointer rounded-t-md p-2 hover:bg-gray-200" onClick={editNode}>
                Edit
              </li>
              <li className="cursor-pointer rounded-b-md p-2 hover:bg-gray-200" onClick={deleteNode}>
                Delete
              </li>
            </ul>
          </div>
        )}
        <div
          className="box-border w-full rounded-t-md p-1"
          style={{
            background: `radial-gradient(
              ellipse at top left,
              var(--type-exit) 0%,
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
