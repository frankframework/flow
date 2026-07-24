import {
  type Edge,
  Handle,
  type Node,
  type NodeProps,
  NodeResizeControl,
  Position,
  type ResizeDragEvent,
  type ResizeParams,
  useReactFlow,
  useStore,
  useUpdateNodeInternals,
} from '@xyflow/react'
import useToasts from '~/components/toast/use-toasts'
import DangerIcon from '../../../../../icons/solar/Danger Triangle.svg?react'
import { type JSX, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import useFlowStore, { isExitNode, isFrankNode } from '~/stores/flow-store'
import { CustomHandle } from '~/routes/studio/canvas/nodetypes/components/handle'
import { FlowConfig } from '~/routes/studio/canvas/flow.config'
import { useNodeContextMenu } from '~/routes/studio/canvas/node-context-menu-context'
import useNodeContextStore from '~/stores/node-context-store'
import { getElementTypeFromName } from '~/routes/studio/node-translator-module'
import { useSettingsStore } from '~/stores/settings-store'
import { useFFDoc } from '@frankframework/doc-library-react'
import HandleMenu from './components/handle-menu'
import { NodeHeader } from './components/node-header'
import { NodeChildrenContainer } from './components/node-children-container'
import { type ChildNode, ChildNodeComponent } from './child-node'
import { findChildRecursive } from '~/stores/child-utilities'
import type { ElementDetails } from '@frankframework/doc-library-core'
import { getInheritedProperties } from '@frankframework/doc-library-core'
import { DeprecatedPopover } from './components/deprecated-popover'
import AddSubcomponentModal from '~/components/flow/add-subcomponent-modal'
import { useFrankConfigXsd } from '~/providers/frankconfig-xsd-provider'
import {
  getAllowedChildElementsForElement,
  getElementRequirements,
  getMissingRequirements,
  isRequirementFulfilled,
  type Requirement,
} from '~/utils/xsd-utils'
import MissingRequirements from './components/missing-requirements'
import ZoomedOutNode from './zoomed-out-node'

export type FrankNodeType = Node<{
  subtype: string
  type: string
  name: string
  sourceHandles: { type: string; index: number }[]
  attributes?: Record<string, string>
  children: ChildNode[]
  manuallyResized?: boolean
  hiddenForwards?: boolean
}> & {
  width?: number
  height?: number
}

function isForwardRevealed(
  targetId: string,
  hoveredNodeId: string | null,
  showAllForwards: boolean,
  edges: Edge[],
): boolean {
  if (showAllForwards || hoveredNodeId === targetId) return true

  return hoveredNodeId !== null && edges.some((edge) => edge.source === hoveredNodeId && edge.target === targetId)
}

export default function FrankNode(properties: NodeProps<FrankNodeType>): JSX.Element {
  const minNodeWidth = FlowConfig.NODE_DEFAULT_WIDTH
  const maxNodeWidth = FlowConfig.NODE_MAX_WIDTH
  const minNodeHeight = FlowConfig.NODE_MIN_HEIGHT
  const type = properties.data.type.toLowerCase()
  const colorVariable = `--type-${type}`
  const handleSpacing = 20
  const containerReference = useRef<HTMLDivElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [canDropDraggedElement, setCanDropDraggedElement] = useState(false)
  const showNodeContextMenu = useNodeContextMenu()
  const { elements, ffDoc } = useFFDoc()
  const { xsdDoc } = useFrankConfigXsd()
  const {
    setNodeId,
    setIsNewNode,
    setAttributes,
    setParentId,
    setChildParentId,
    setIsEditing,
    setDraggedName,
    draggedName,
    setEditingSubtype,
  } = useNodeContextStore()
  const { showWarningToast } = useToasts()
  const gradientEnabled = useSettingsStore((state) => state.studio.gradient)
  const zoom = useStore((state) => state.transform[2])
  const isCompact = zoom < FlowConfig.ZOOM_THRESHOLD
  const [isOverflowing, setIsOverflowing] = useState(false)
  const sourceHandles = properties.data.sourceHandles
  const addHandle = useFlowStore.getState().addHandle

  const frankElement = useMemo(() => {
    if (!elements || !ffDoc || properties.data.subtype === 'Receiver') return

    const element = elements[properties.data.subtype]
    if (!element) return

    const inherited = getInheritedProperties(element, ffDoc.elements, ffDoc.enums)
    // TODO: Remove when https://github.com/frankframework/frank-doc/issues/466 is fixed.
    const fixedForwardPipeForwards = ffDoc.elements['org.frankframework.pipes.FixedForwardPipe']?.forwards
    const successForward = element.labels['EIP'] !== 'Router' && fixedForwardPipeForwards
    element.forwards = { ...element.forwards, ...inherited.forwards, ...successForward }

    return element
  }, [elements, ffDoc, properties.data.subtype])

  useEffect(() => {
    if (!frankElement?.forwards) return

    if (
      Object.keys(frankElement.forwards).includes('success') &&
      sourceHandles.every((handle) => handle.type !== 'success')
    ) {
      addHandle(properties.id, { type: 'success', index: sourceHandles.length + 1 })
    }
  }, [addHandle, frankElement?.forwards, properties.id, sourceHandles])

  const isDeprecated = frankElement?.deprecated
  const [showDeprecated, setShowDeprecated] = useState(false)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)
  const [isSubcomponentModalOpen, setIsSubcomponentModalOpen] = useState(false)
  const dangerTriangleReference = useRef<HTMLDivElement>(null)

  const hoveredNodeId = useNodeContextStore((state) => state.hoveredNodeId)
  const showAllForwards = useNodeContextStore((state) => state.showAllForwards)
  const edges = useFlowStore((state) => state.edges)
  const hiddenForwardNodeIds = useFlowStore(
    useShallow((state) =>
      state.nodes
        .filter((node) => (isFrankNode(node) || isExitNode(node)) && node.data.hiddenForwards)
        .map((node) => node.id),
    ),
  )

  const dimmedHandleIndices = useMemo(() => {
    const dimmed = new Set<number>()
    if (hiddenForwardNodeIds.length === 0) return dimmed
    const hiddenSet = new Set(hiddenForwardNodeIds)

    for (const edge of edges) {
      if (
        edge.source !== properties.id ||
        !hiddenSet.has(edge.target) ||
        isForwardRevealed(edge.target, hoveredNodeId, showAllForwards, edges)
      )
        continue

      const handleIndex = Number(edge.sourceHandle)
      if (!Number.isNaN(handleIndex)) dimmed.add(handleIndex)
    }

    return dimmed
  }, [edges, hiddenForwardNodeIds, hoveredNodeId, showAllForwards, properties.id])

  const allowedChildNames = useMemo(
    () => (xsdDoc ? new Set(getAllowedChildElementsForElement(xsdDoc, properties.data.subtype)) : null),
    [xsdDoc, properties.data.subtype],
  )

  const possibleChildren = useMemo(() => {
    if (!elements || !allowedChildNames) return []

    const recordElements = elements as Record<string, ElementDetails>

    return Object.values(recordElements).filter((element) => allowedChildNames.has(element.name))
  }, [elements, allowedChildNames])
  const [mandatoryChildren, setMandatoryChildren] = useState<Requirement[]>([])
  const [mandatoryChildrenFulfilled, setMandatoryChildrenFulfilled] = useState(false)
  const [missingChildren, setMissingChildren] = useState<string[]>([])

  const reactFlow = useReactFlow()
  const updateNodeInternals = useUpdateNodeInternals()
  const [isHandleMenuOpen, setIsHandleMenuOpen] = useState(false)
  const [handleMenuPosition, setHandleMenuPosition] = useState({ x: 0, y: 0 })
  const [isManuallyResized, setIsManuallyResized] = useState(properties.data.manuallyResized)
  const { handleMenuTypesAllowed, handleMenuTypesAllowedHasOptions } = useMemo(() => {
    if (!frankElement?.forwards) return {}
    const filteredHandles = Object.entries(frankElement.forwards).filter(([type]) =>
      sourceHandles.every((handle) => handle.type !== type),
    )

    return {
      handleMenuTypesAllowed: Object.fromEntries(filteredHandles),
      handleMenuTypesAllowedHasOptions: filteredHandles.length > 0,
    }
  }, [frankElement?.forwards, sourceHandles])

  const [dimensions, setDimensions] = useState({
    width: properties.width ?? minNodeWidth,
    height: properties.height ?? minNodeHeight,
  })

  const firstHandlePosition = useMemo(() => {
    return (dimensions.height - (sourceHandles.length - 1) * handleSpacing) / 2
  }, [dimensions.height, sourceHandles.length])

  useEffect(() => {
    if (!(dragOver && containerReference.current)) return

    updateNodeInternals(properties.id)

    const newHeight = containerReference.current.offsetHeight
    setDimensions((previous) => ({ ...previous, height: newHeight }))
  }, [dragOver, properties.id, updateNodeInternals])

  useEffect(() => {
    updateNodeInternals(properties.id)
  }, [dimensions.height, isCompact, properties.id, updateNodeInternals])

  useEffect(() => {
    if (!xsdDoc) return
    setMandatoryChildren(getElementRequirements(xsdDoc, properties.data.subtype))
  }, [xsdDoc, properties.data.subtype])

  useEffect(() => {
    const children = properties.data.children

    const allFulfilled = isRequirementFulfilled(mandatoryChildren, children)
    setMandatoryChildrenFulfilled(allFulfilled)

    const missing = getMissingRequirements(mandatoryChildren, children)
    setMissingChildren(missing)
  }, [mandatoryChildren, properties.data.children])

  useLayoutEffect(() => {
    if (!containerReference.current) return

    const measuredHeight = containerReference.current.offsetHeight
    const scrollHeight = containerReference.current.scrollHeight
    setIsOverflowing(scrollHeight > measuredHeight + 4)
    setDimensions((previous) => {
      if (Math.abs(previous.height - measuredHeight) > 2) {
        return { ...previous, height: measuredHeight }
      }
      return previous
    })
  }, [properties.data.children, sourceHandles.length, dragOver])

  useEffect(() => {
    const container = containerReference.current
    if (!container) return
    const observer = new ResizeObserver(() => {
      setIsOverflowing(container.scrollHeight > container.offsetHeight + 4)
    })
    observer.observe(container)
    return (): void => observer.disconnect()
  }, [])

  const addChild = useFlowStore((state) => state.addChild)

  const handleMenuClick = useCallback(
    (handleType: string) => {
      addHandle(properties.id, {
        type: handleType,
        index: sourceHandles.length + 1,
      })
      updateNodeInternals(properties.id) // Update the edge
      setIsHandleMenuOpen(false) // Close the menu after selection
    },
    [addHandle, properties.id, sourceHandles.length, updateNodeInternals],
  )

  const toggleHandleMenu = (event: React.MouseEvent): void => {
    const { clientX, clientY } = event

    setHandleMenuPosition({
      x: clientX,
      y: clientY,
    })

    setIsHandleMenuOpen((previous) => !previous)
  }

  const editChild = (childId: string): void => {
    const child = findChildRecursive(properties.data.children, childId)
    if (!child) return

    const recordElements = elements as Record<string, ElementDetails>
    const attributes = Object.values(recordElements).find((element) => element.name === child.subtype)?.attributes

    const isFirstLevel = properties.data.children.some((c) => c.id === childId)
    setParentId(properties.id)
    setChildParentId(isFirstLevel ? null : properties.id)
    setNodeId(+childId)
    setAttributes(attributes)
    setEditingSubtype(child.subtype)
    showNodeContextMenu(true)
    setIsEditing(true)
  }

  const selectChild = (childId: string): void => {
    const child = findChildRecursive(properties.data.children, childId)
    if (!child) return

    const recordElements = elements as Record<string, ElementDetails>
    const attributes = Object.values(recordElements).find((element) => element.name === child.subtype)?.attributes

    const isFirstLevel = properties.data.children.some((childNode) => childNode.id === childId)
    setParentId(properties.id)
    setChildParentId(isFirstLevel ? null : properties.id)
    setNodeId(+childId)
    setAttributes(attributes)
    setEditingSubtype(child.subtype)
    showNodeContextMenu(true)

    reactFlow.setNodes((nodes) => nodes.map((node) => ({ ...node, selected: false })))
  }

  const changeHandleType = (currentHandle: { type: string; index: number }, newType: string): void => {
    // Prevent changing to a duplicate handle type
    const existing = sourceHandles.some((handle) => handle.type === newType && handle.index !== currentHandle.index)

    if (existing) {
      showWarningToast(`Handle of type "${newType}" is already present!`)
      console.warn(`Handle of type "${newType}" is already present!`)
      return
    }

    if (currentHandle.type === 'success') {
      addHandle(properties.id, { type: 'success', index: sourceHandles.length + 1 })
    }
    useFlowStore
      .getState()
      .updateHandle(properties.id, currentHandle.index, { type: newType, index: currentHandle.index })
    // Timeout to prevent bug from edgelabel not properly updating
    setTimeout(() => {
      updateNodeInternals(properties.id)
    }, 0)
  }

  const canAcceptChild = useCallback(
    (droppedName: string) => allowedChildNames?.has(droppedName) ?? false,
    [allowedChildNames],
  )

  const handleDragOver = (event: React.DragEvent): void => {
    event.preventDefault()
    event.stopPropagation()

    const isInsideChild = (event.target as HTMLElement).closest('.child-drop-zone')

    const raw = event.dataTransfer.getData('application/reactflow')
    if (!raw) {
      setDragOver(false)
      return
    }

    const dropped = JSON.parse(raw)
    const allowed = canAcceptChild(dropped.name)

    event.dataTransfer.dropEffect = allowed ? 'copy' : 'none'

    if (!allowed || isInsideChild) {
      setDragOver(false)
    } else {
      setDragOver(true)
    }
  }

  const handleDragLeave = (): void => {
    setDragOver(false)
  }

  const createChildFromElement = useCallback(
    (element: ElementDetails) => {
      const newId = useFlowStore.getState().getNextNodeId()

      setNodeId(+newId)
      setAttributes(element.attributes)

      setIsNewNode(true)
      setEditingSubtype(element.name)
      showNodeContextMenu(true)
      setIsEditing(true)
      setParentId(properties.id)
      setChildParentId(null)

      const child: ChildNode = {
        id: newId,
        subtype: element.name,
        type: getElementTypeFromName(element.name),
        name: '',
        attributes: {},
        children: [],
      }

      addChild(properties.id, child)
    },
    [
      setNodeId,
      setAttributes,
      setIsNewNode,
      setEditingSubtype,
      showNodeContextMenu,
      setIsEditing,
      setParentId,
      properties.id,
      setChildParentId,
      addChild,
    ],
  )

  const handleDropOnNode = useCallback(
    (event: React.DragEvent) => {
      setDragOver(false)
      setDraggedName(null)
      event.preventDefault()
      event.stopPropagation()

      const raw = event.dataTransfer.getData('application/reactflow')
      if (!raw) return

      const dropped = JSON.parse(raw)

      if (!canAcceptChild(dropped.name)) {
        console.warn(`Rejected drop: ${dropped.name} is not allowed as child of ${properties.data.subtype}`)
        return
      }

      const element = elements?.[dropped.name]
      if (!element) return

      createChildFromElement(element)
    },
    [setDraggedName, canAcceptChild, properties.data.subtype, elements, createChildFromElement],
  )

  useEffect(() => {
    if (!draggedName || !frankElement) {
      setCanDropDraggedElement(false)
      return
    }

    const allowed = canAcceptChild(draggedName)

    if (allowed) {
      setCanDropDraggedElement(true)
    } else {
      setCanDropDraggedElement(false)
    }
  }, [draggedName, canAcceptChild, frankElement])

  if (isCompact) {
    return (
      <ZoomedOutNode
        subtype={properties.data.subtype}
        colorVariable={colorVariable}
        selected={properties.selected}
        showTargetHandle={properties.data.subtype !== 'Receiver'}
        sourceHandles={sourceHandles}
      />
    )
  }

  return (
    <>
      <NodeResizeControl
        minWidth={minNodeWidth}
        minHeight={minNodeHeight}
        onResize={(_event: ResizeDragEvent, data: ResizeParams) => {
          setIsManuallyResized(true)
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
        className={`bg-background border-border relative flex flex-col items-center overflow-x-visible rounded-md border shadow-md ${isManuallyResized ? 'h-full w-full overflow-y-hidden' : 'overflow-y-visible'}`}
        style={{
          minWidth: `${minNodeWidth}px`,
          ...(!isManuallyResized && { width: 'max-content', maxWidth: `${maxNodeWidth}px` }),
          ...(properties.selected && { borderColor: `var(${colorVariable})` }),
        }}
        ref={containerReference}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDropOnNode}
      >
        <NodeHeader
          subtype={properties.data.subtype}
          name={properties.data.name}
          colorVariable={colorVariable}
          gradientEnabled={gradientEnabled}
        >
          {isDeprecated && frankElement?.deprecated && (
            <>
              <div
                ref={dangerTriangleReference}
                className="absolute top-0.5 right-1 z-10 flex items-center justify-center"
                onMouseEnter={() => {
                  if (dangerTriangleReference.current) {
                    setAnchorRect(dangerTriangleReference.current.getBoundingClientRect())
                  }
                  setShowDeprecated(true)
                }}
                onMouseLeave={() => setShowDeprecated(false)}
              >
                <DangerIcon />
              </div>

              {showDeprecated && <DeprecatedPopover deprecated={frankElement.deprecated} anchorRect={anchorRect} />}
            </>
          )}
        </NodeHeader>
        {properties.data.attributes &&
          Object.entries(properties.data.attributes).map(([key, value]) => (
            <div key={key} className="my-1 w-full max-w-full min-w-0 px-1">
              <p className="text-foreground overflow-hidden text-sm font-bold text-ellipsis whitespace-nowrap">{key}</p>
              <p className="text-foreground overflow-hidden text-sm text-ellipsis whitespace-nowrap">{value}</p>
            </div>
          ))}
        {(properties.data.children.length > 0 || dragOver || canDropDraggedElement) && (
          <div className="w-full min-w-0 p-4">
            <NodeChildrenContainer>
              {properties.data.children.map((child) => (
                <div key={child.id} data-child-id={child.id} className="child-drop-zone">
                  <ChildNodeComponent
                    child={child}
                    gradientEnabled={gradientEnabled}
                    onEdit={editChild}
                    onSelect={selectChild}
                    parentId={properties.id}
                    rootId={properties.id}
                  />
                </div>
              ))}

              {/* Drop zone */}
              {dragOver && (
                <div
                  className="border-foreground-muted bg-foreground-muted/20 flex items-center justify-center border-2 border-dashed text-center text-xs italic"
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
              {canDropDraggedElement && !dragOver && (
                <div className="mt-2 pl-4">
                  <div
                    className="border-foreground-muted bg-foreground-muted/20 flex items-center justify-center border-2 border-dashed text-center text-xs italic"
                    style={{
                      height: '20px', // half height
                      width: '100%', // full width
                      borderRadius: '6px',
                    }}
                  >
                    Can drop here
                  </div>
                </div>
              )}
            </NodeChildrenContainer>
          </div>
        )}
        {/* Show missing mandatory children if the node is missing any */}
        <MissingRequirements missingChildren={missingChildren} isFulfilled={mandatoryChildrenFulfilled} />

        {possibleChildren.length > 0 && (
          <div
            className="hover:text-foreground text-foreground-muted flex cursor-pointer gap-1 self-start p-1"
            onClick={() => setIsSubcomponentModalOpen(true)}
          >
            <div className="bg-foreground/30 border-border h-4 w-4 justify-center rounded-full border text-center text-[8px] font-bold">
              +
            </div>
            <p className="text-xs">Add a subcomponent</p>
          </div>
        )}

        {isOverflowing && (
          <div
            className="pointer-events-none absolute right-0 bottom-0 left-0 z-10"
            style={{
              height: '40px',
              background: 'linear-gradient(to bottom, transparent, var(--color-background))',
            }}
          />
        )}
      </div>

      {/* Receivers can only have outgoing connections, so we hide the input handle for them */}
      {properties.data.subtype === 'Receiver' ? (
        <></>
      ) : (
        /*
         * TODO: https://github.com/frankframework/flow/issues/613
         * <Handle
         *   type="source"
         *   position={Position.Right}
         *   isConnectableStart={false}
         *   className="flex items-center justify-center text-white"
         *   style={{
         *     right: '-15px',
         *     width: '15px',
         *     height: '15px',
         *     backgroundColor: '#B2B2B2',
         *   }}
         * />
         */
        <>
          <Handle
            type="target"
            position={Position.Left}
            isConnectableStart={false}
            className="flex items-center justify-center text-white"
            style={{
              left: '-15px',
              width: '15px',
              height: '15px',
              backgroundColor: '#B2B2B2',
            }}
          />
          {sourceHandles.map((handle) => (
            <CustomHandle
              key={handle.type + handle.index}
              type={handle.type}
              index={handle.index}
              firstHandlePosition={firstHandlePosition}
              handleSpacing={handleSpacing}
              onChangeType={(newType) => changeHandleType(handle, newType)}
              absolutePosition={{ x: properties.positionAbsoluteX, y: properties.positionAbsoluteY }}
              typesAllowed={handleMenuTypesAllowed}
              dimmed={dimmedHandleIndices.has(handle.index)}
            />
          ))}
        </>
      )}
      {/* Only show the add handle button if there are available handle types that are not yet used on this node */}
      {handleMenuTypesAllowedHasOptions && (
        <div
          onClick={(event) => {
            toggleHandleMenu(event)
          }}
          className="nodrag absolute h-4 w-4 cursor-pointer justify-center rounded-full border bg-gray-400 text-center text-[8px] font-bold text-white"
          style={{
            top: `${firstHandlePosition + sourceHandles.length * handleSpacing + 12.5}px`,
            right: '-23px',
          }}
        >
          +
        </div>
      )}
      {isHandleMenuOpen && (
        <HandleMenu
          title="Select Handle Type"
          position={handleMenuPosition}
          onClose={() => setIsHandleMenuOpen(false)}
          onSelect={handleMenuClick}
          typesAllowed={handleMenuTypesAllowed}
        />
      )}

      {isSubcomponentModalOpen && (
        <AddSubcomponentModal
          onClose={() => setIsSubcomponentModalOpen(false)}
          possibleChildren={possibleChildren}
          onAddChild={createChildFromElement}
        />
      )}
    </>
  )
}

export function ResizeIcon({ color = '#999999' }: Readonly<{ color?: string }>): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      strokeWidth="1"
      stroke={color}
      strokeLinecap="round"
      className={'absolute right-1.25 bottom-1.25'}
    >
      <line x1="19" y1="20" x2="20" y2="19" />
      <line x1="14" y1="20" x2="20" y2="14" />
      <line x1="9" y1="20" x2="20" y2="9" />
    </svg>
  )
}
