import {
  Handle,
  type Node,
  type NodeProps,
  NodeResizeControl,
  Position,
  useReactFlow,
  useUpdateNodeInternals,
} from '@xyflow/react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import useFlowStore from '~/stores/flow-store'
import { CustomHandle } from '~/routes/studio/canvas/nodetypes/components/handle'
import { FlowConfig } from '~/routes/studio/canvas/flow.config'
import { useNodeContextMenu } from '~/routes/studio/canvas/flow'
import useNodeContextStore from '~/stores/node-context-store'
import { getElementTypeFromName } from '~/routes/studio/node-translator-module'
import { useFFDoc } from '@frankframework/ff-doc/react'
import variables from '../../../../../environment/environment'
import { useSettingsStore } from '~/routes/settings/settings-store'
import HandleMenu from './components/handle-menu'
import type { ActionType } from './components/action-types'
import { ChildNode } from './child-node'
import { findChildRecursive } from '~/stores/child-utilities'
import { canAcceptChildStatic } from './node-utilities'

export type frankNode = Node<{
  subtype: string
  type: string
  name: string
  sourceHandles: { type: ActionType; index: number }[]
  attributes?: Record<string, string>
  children: ChildNode[]
}>

export default function FrankNode(properties: NodeProps<frankNode>) {
  const minNodeWidth = FlowConfig.NODE_DEFAULT_WIDTH
  const minNodeHeight = FlowConfig.NODE_DEFAULT_HEIGHT
  const type = properties.data.type.toLowerCase()
  const colorVariable = `--type-${type}`
  const handleSpacing = 20
  const containerReference = useRef<HTMLDivElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const showNodeContextMenu = useNodeContextMenu()
  const FRANK_DOC_URL = variables.frankDocJsonUrl
  const { elements, filters } = useFFDoc(FRANK_DOC_URL)
  const [dragForbidden, setDragForbidden] = useState(false)
  const { setNodeId, setAttributes, setParentId, setIsEditing } = useNodeContextStore()
  const gradientEnabled = useSettingsStore((state) => state.studio.gradient)
  // Store the associated Frank element
  const frankElement = useMemo(() => {
    if (!elements) return null
    const recordElements = elements as Record<string, { name: string; [key: string]: any }>

    return Object.values(recordElements).find((element) => element.name === properties.data.subtype) ?? null
  }, [elements, properties.data.subtype])

  const updateNodeInternals = useUpdateNodeInternals()

  const reactFlow = useReactFlow()
  const [isHandleMenuOpen, setIsHandleMenuOpen] = useState(false)
  const [handleMenuPosition, setHandleMenuPosition] = useState({ x: 0, y: 0 })

  const [dimensions, setDimensions] = useState({
    width: minNodeWidth, // Initial width
    height: minNodeHeight, // Initial height
  })

  const firstHandlePosition = useMemo(() => {
    return (dimensions.height - (properties.data.sourceHandles.length - 1) * handleSpacing) / 2
  }, [dimensions.height, properties.data.sourceHandles.length])

  useEffect(() => {
    if (dragOver && containerReference.current) {
      updateNodeInternals(properties.id)

      const newHeight = containerReference.current.offsetHeight
      setDimensions((previous) => ({ ...previous, height: newHeight }))
    }
  }, [dragOver])

  useLayoutEffect(() => {
    if (containerReference.current) {
      const measuredHeight = containerReference.current.offsetHeight
      setDimensions((previous) => {
        if (Math.abs(previous.height - measuredHeight) > 2) {
          return { ...previous, height: measuredHeight }
        }
        return previous
      })
    }
  }, [properties.data.children, properties.data.sourceHandles.length, dragOver])

  const addHandle = useFlowStore.getState().addHandle
  const addChild = useFlowStore((state) => state.addChild)

  const handleMenuClick = useCallback(
    (handleType: ActionType) => {
      addHandle(properties.id, {
        type: handleType,
        index: properties.data.sourceHandles.length + 1,
      })
      updateNodeInternals(properties.id) // Update the edge
      setIsHandleMenuOpen(false) // Close the menu after selection
    },
    [addHandle, properties.id, properties.data.sourceHandles.length, updateNodeInternals],
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

  const editNode = () => {
    if (!frankElement) return
    const attributes = frankElement.attributes
    setNodeId(+properties.id)
    setAttributes(attributes)
    showNodeContextMenu(true)
    setIsEditing(true)
  }

  const editChild = (childId: string) => {
    const child = findChildRecursive(properties.data.children, childId)
    if (!child) return

    const recordElements = elements as Record<string, { name: string; [key: string]: any }>
    const attributes = Object.values(recordElements).find((element) => element.name === child.subtype)?.attributes

    setParentId(properties.id) // The FrankNode stays the parent for editing purposes
    setNodeId(+childId) // Correctly set the clicked child id
    setAttributes(attributes)
    showNodeContextMenu(true)
    setIsEditing(true)
  }

  const changeHandleType = (handleIndex: number, newType: ActionType) => {
    useFlowStore.getState().updateHandle(properties.id, handleIndex, { type: newType, index: handleIndex })
    // Timeout to prevent bug from edgelabel not properly updating
    setTimeout(() => {
      updateNodeInternals(properties.id)
    }, 0)
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'none'

    const isInsideChild = (event.target as HTMLElement).closest('.child-drop-zone')

    const raw = event.dataTransfer.getData('application/reactflow')
    if (!raw) {
      setDragOver(false)
      return
    }

    const dropped = JSON.parse(raw)
    const allowed = canAcceptChild(dropped.name)

    if (!allowed || isInsideChild) {
      setDragOver(false)
      setDragForbidden(true)
    } else {
      setDragOver(true)
      setDragForbidden(false)
    }
  }

  const handleDragLeave = () => {
    setDragOver(false)
    setDragForbidden(false)
  }

  const handleDropOnNode = useCallback(
    (event: React.DragEvent) => {
      setDragOver(false)
      event.preventDefault()
      event.stopPropagation()

      const raw = event.dataTransfer.getData('application/reactflow')
      if (!raw) return

      const dropped = JSON.parse(raw)
      const newId = useFlowStore.getState().getNextNodeId()

      if (!canAcceptChild(dropped.name)) {
        console.warn(`Rejected drop: ${dropped.name} is not allowed as child of ${properties.data.subtype}`)
        return
      }

      showNodeContextMenu(true)
      setIsEditing(true)
      setParentId(properties.id)

      const child: ChildNode = {
        id: newId,
        subtype: dropped.name,
        type: getElementTypeFromName(dropped.name),
        name: '',
        attributes: {},
        children: [],
      }

      addChild(properties.id, child)
    },
    [properties.id, addChild, frankElement],
  )

  const canAcceptChild = useCallback(
    (droppedName: string) => {
      return canAcceptChildStatic(frankElement, droppedName, filters)
    },
    [frankElement, filters],
  )

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
        className={`bg-background flex h-full w-full flex-col items-center overflow-x-visible overflow-y-hidden rounded-md border ${dragForbidden ? 'border-red-500' : 'border-border'}`}
        style={{
          minHeight: `${minNodeHeight}px`,
          minWidth: `${minNodeWidth}px`,
        }}
        ref={containerReference}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDropOnNode}
        onDoubleClick={editNode}
      >
        <div
          className={`border-b-border box-border w-full rounded-t-md border-b p-1`}
          style={{
            background: gradientEnabled
              ? `radial-gradient(
                ellipse farthest-corner at 20% 20%,
                var(${colorVariable}) 0%,
                var(--color-background) 100%
              )`
              : `var(${colorVariable})`,
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
              <p className="text-gray-1000 overflow-hidden text-sm font-bold overflow-ellipsis whitespace-nowrap">
                {key}
              </p>
              <p className="overflow-hidden text-sm overflow-ellipsis whitespace-nowrap">{value}</p>
            </div>
          ))}
        {(properties.data.children.length > 0 || dragOver) && (
          <div className="w-full p-4">
            <div className="border-border bg-background w-full rounded-md p-4 shadow-[inset_0px_2px_4px_rgba(0,0,0,0.1)]">
              {properties.data.children.map((child) => (
                <div key={child.id} data-child-id={child.id} className="child-drop-zone">
                  <ChildNode
                    child={child}
                    gradientEnabled={gradientEnabled}
                    onEdit={editChild}
                    parentId={properties.id}
                    rootId={properties.id}
                  />
                </div>
              ))}

              {dragOver && (
                <div
                  className="border-foreground-muted bg-foreground-muted/50 flex items-center justify-center border-2 border-dashed text-center text-xs italic"
                  style={{
                    height: '100px',
                    width: '100%',
                    marginTop: '8px',
                    borderRadius: '6px',
                  }}
                >
                  Drop to add child
                </div>
              )}
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
        <HandleMenu
          position={handleMenuPosition}
          onClose={() => setIsHandleMenuOpen(false)}
          onSelect={handleMenuClick}
        />
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
