import {
  Handle,
  type Node,
  type NodeProps,
  NodeResizeControl,
  Position,
  useStore,
  useUpdateNodeInternals,
} from '@xyflow/react'
import DangerIcon from '../../../../../icons/solar/Danger Triangle.svg?react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import useFlowStore from '~/stores/flow-store'
import { CustomHandle } from '~/routes/studio/canvas/nodetypes/components/handle'
import { FlowConfig } from '~/routes/studio/canvas/flow.config'
import { useNodeContextMenu } from '~/routes/studio/canvas/node-context-menu-context'
import useNodeContextStore from '~/stores/node-context-store'
import { getElementTypeFromName } from '~/routes/studio/node-translator-module'
import { useSettingsStore } from '~/stores/settings-store'
import { useFFDoc } from '@frankframework/doc-library-react'
import HandleMenu from './components/handle-menu'
import { ChildNodeComponent, type ChildNode } from './child-node'
import { findChildRecursive } from '~/stores/child-utilities'
import { canAcceptChildStatic } from './node-utilities'
import type { ElementDetails } from '@frankframework/doc-library-core'
import { DeprecatedPopover } from './components/deprecated-popover'
import { showWarningToast } from '~/components/toast'
import { useHandleTypes } from '~/hooks/use-handle-types'
import AddSubcomponentModal from '~/components/flow/add-subcomponent-modal'
import { fetchFrankConfigXsd } from '~/services/xsd-service'
import {
  type Requirement,
  getElementRequirements,
  getMissingRequirements,
  isRequirementFulfilled,
  parseXsd,
} from '~/utils/xsd-utils'
import MissingRequirements from './components/missing-requirements'

export type FrankNodeType = Node<{
  subtype: string
  type: string
  name: string
  sourceHandles: { type: string; index: number }[]
  attributes?: Record<string, string>
  children: ChildNode[]
}> & {
  width?: number
  height?: number
}

export default function FrankNode(properties: NodeProps<FrankNodeType>) {
  const minNodeWidth = FlowConfig.NODE_DEFAULT_WIDTH
  const minNodeHeight = FlowConfig.NODE_MIN_HEIGHT
  const type = properties.data.type.toLowerCase()
  const colorVariable = `--type-${type}`
  const handleSpacing = 20
  const containerReference = useRef<HTMLDivElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [canDropDraggedElement, setCanDropDraggedElement] = useState(false)
  const showNodeContextMenu = useNodeContextMenu()
  const { elements, filters } = useFFDoc()
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
  const gradientEnabled = useSettingsStore((state) => state.studio.gradient)
  const zoom = useStore((state) => state.transform[2])
  const isCompact = zoom < 0.4
  const [isOverflowing, setIsOverflowing] = useState(false)

  const frankElement = useMemo(() => {
    if (!elements) return null
    const recordElements = elements as Record<string, ElementDetails>

    return Object.values(recordElements).find((element) => element.name === properties.data.subtype) ?? null
  }, [elements, properties.data.subtype])

  const isDeprecated = frankElement?.deprecated
  const [showDeprecated, setShowDeprecated] = useState(false)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const dangerTriangleReference = useRef<HTMLDivElement>(null)
  const availableHandleTypes = useHandleTypes(frankElement?.forwards)
  const possibleChildren = useMemo(() => {
    if (!elements || !frankElement) return []

    const recordElements = elements as Record<string, ElementDetails>

    return Object.values(recordElements).filter((element) => canAcceptChildStatic(frankElement, element.name, filters))
  }, [elements, frankElement, filters])
  const [mandatoryChildren, setMandatoryChildren] = useState<Requirement[]>([])
  const [mandatoryChildrenFulfilled, setMandatoryChildrenFulfilled] = useState(false)
  const [missingChildren, setMissingChildren] = useState<string[]>([])

  const updateNodeInternals = useUpdateNodeInternals()
  const [isHandleMenuOpen, setIsHandleMenuOpen] = useState(false)
  const [handleMenuPosition, setHandleMenuPosition] = useState({ x: 0, y: 0 })

  const [dimensions, setDimensions] = useState({
    width: properties.width!, // Initial width, safe to assume it exists because it gets set manually in xml-to-json-parser
    height: properties.height!, // Initial height, ''
  })

  const firstHandlePosition = useMemo(() => {
    return (dimensions.height - (properties.data.sourceHandles.length - 1) * handleSpacing) / 2
  }, [dimensions.height, properties.data.sourceHandles.length])

  const compactFirstHandlePosition = useMemo(() => {
    return (minNodeHeight - (properties.data.sourceHandles.length - 1) * handleSpacing) / 2
  }, [minNodeHeight, properties.data.sourceHandles.length])

  const allForwardTypesUsed = useMemo(() => {
    if (availableHandleTypes.length === 0) return true

    // If custom is allowed, "+" should always remain visible
    if (availableHandleTypes.includes('custom')) {
      return false
    }

    const existingTypesCount = properties.data.sourceHandles.length

    return existingTypesCount >= availableHandleTypes.length
  }, [availableHandleTypes, properties.data.sourceHandles])

  useEffect(() => {
    if (dragOver && containerReference.current) {
      updateNodeInternals(properties.id)

      const newHeight = containerReference.current.offsetHeight
      setDimensions((previous) => ({ ...previous, height: newHeight }))
    }
  }, [dragOver, properties.id, updateNodeInternals])

  useEffect(() => {
    fetchFrankConfigXsd().then((xsd) => {
      const doc = parseXsd(xsd)
      const mandatory = getElementRequirements(doc, properties.data.subtype)
      setMandatoryChildren(mandatory)
    })
  }, [properties.data.subtype])

  useEffect(() => {
    const children = properties.data.children

    const allFulfilled = isRequirementFulfilled(mandatoryChildren, children)
    setMandatoryChildrenFulfilled(allFulfilled)

    const missing = getMissingRequirements(mandatoryChildren, children)
    setMissingChildren(missing)
  }, [mandatoryChildren, properties.data.children])

  useLayoutEffect(() => {
    if (containerReference.current) {
      const measuredHeight = containerReference.current.offsetHeight
      const scrollHeight = containerReference.current.scrollHeight
      setIsOverflowing(scrollHeight > measuredHeight + 4)
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

  const hasHandleOfType = useCallback(
    (type: string) => {
      // Custom handles are never considered duplicates
      if (type === 'custom') return false

      return properties.data.sourceHandles.some((handle) => handle.type === type)
    },
    [properties.data.sourceHandles],
  )

  const handleMenuClick = useCallback(
    (handleType: string) => {
      // Prevent adding duplicate handle types
      if (hasHandleOfType(handleType)) {
        showWarningToast(`Handle of type "${handleType}" is already present!`)
        console.warn(`Handle of type "${handleType}" is already present!`)
        return
      }

      addHandle(properties.id, {
        type: handleType,
        index: properties.data.sourceHandles.length + 1,
      })
      updateNodeInternals(properties.id) // Update the edge
      setIsHandleMenuOpen(false) // Close the menu after selection
    },
    [hasHandleOfType, addHandle, properties.id, properties.data.sourceHandles.length, updateNodeInternals],
  )

  const toggleHandleMenu = (event: React.MouseEvent) => {
    const { clientX, clientY } = event

    setHandleMenuPosition({
      x: clientX,
      y: clientY,
    })

    setIsHandleMenuOpen((prev) => !prev)
  }

  const editNode = () => {
    if (!frankElement) return
    const attributes = frankElement.attributes
    setParentId(null)
    setChildParentId(null)
    setNodeId(+properties.id)
    setAttributes(attributes)
    setEditingSubtype(properties.data.subtype)
    showNodeContextMenu(true)
    setIsEditing(true)
  }

  const editChild = (childId: string) => {
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

  const changeHandleType = (handleIndex: number, newType: string) => {
    // Prevent changing to a duplicate handle type
    const existing = properties.data.sourceHandles.some(
      (handle) => handle.type === newType && handle.index !== handleIndex,
    )

    if (existing) {
      showWarningToast(`Handle of type "${newType}" is already present!`)
      console.warn(`Handle of type "${newType}" is already present!`)
      return
    }

    useFlowStore.getState().updateHandle(properties.id, handleIndex, { type: newType, index: handleIndex })
    // Timeout to prevent bug from edgelabel not properly updating
    setTimeout(() => {
      updateNodeInternals(properties.id)
    }, 0)
  }

  const canAcceptChild = useCallback(
    (droppedName: string) => {
      return canAcceptChildStatic(frankElement, droppedName, filters)
    },
    [frankElement, filters],
  )

  const handleDragOver = (event: React.DragEvent) => {
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

  const handleDragLeave = () => {
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
      properties.id,
      addChild,
      setIsNewNode,
      setEditingSubtype,
      showNodeContextMenu,
      setIsEditing,
      setParentId,
      setChildParentId,
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
    const abbr =
      properties.data.subtype.replaceAll(/[a-z]/g, '').slice(0, 4) || properties.data.subtype.slice(0, 2).toUpperCase()

    return (
      <>
        <div
          className="bg-background border-border flex h-full w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-md border"
          style={{
            minWidth: `${minNodeWidth}px`,
            minHeight: `${minNodeHeight}px`,
            ...(properties.selected && { borderColor: `var(${colorVariable})` }),
          }}
          onDoubleClick={editNode}
        >
          <div
            className="flex h-32 w-32 shrink-0 items-center justify-center rounded-3xl shadow-md"
            style={{
              backgroundColor: `color-mix(in srgb, var(${colorVariable}) 25%, transparent)`,
              border: `3px solid var(${colorVariable})`,
            }}
          >
            <span className="text-4xl font-black tracking-tight" style={{ color: `var(${colorVariable})` }}>
              {abbr}
            </span>
          </div>

          <span className="mt-5 line-clamp-2 w-full px-2 text-center text-2xl leading-snug font-semibold">
            {properties.data.subtype}
          </span>

          {properties.data.name && (
            <span className="text-foreground-muted line-clamp-1 w-full px-1 text-center text-2xl">
              {properties.data.name}
            </span>
          )}
        </div>

        {frankElement?.name && frankElement.name !== 'Receiver' && (
          <Handle
            type="target"
            position={Position.Left}
            style={{ opacity: 0, left: '-15px', width: '15px', height: '15px' }}
          />
        )}

        {properties.data.sourceHandles.map((handle) => (
          <CustomHandle
            key={handle.type + handle.index}
            type={handle.type}
            index={handle.index}
            firstHandlePosition={compactFirstHandlePosition}
            handleSpacing={handleSpacing}
            onChangeType={(newType) => changeHandleType(handle.index, newType)}
            absolutePosition={{ x: properties.positionAbsoluteX, y: properties.positionAbsoluteY }}
            typesAllowed={frankElement?.forwards}
          />
        ))}
      </>
    )
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
        className={`bg-background border-border relative flex w-full flex-col items-center overflow-x-visible rounded-md border ${properties.height ? 'h-full overflow-y-hidden' : 'overflow-y-visible'}`}
        style={{
          minWidth: `${minNodeWidth}px`,
          minHeight: `${minNodeHeight}px`,
          ...(properties.selected && { borderColor: `var(${colorVariable})` }),
        }}
        ref={containerReference}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDropOnNode}
        onDoubleClick={editNode}
      >
        <div
          className={`border-b-border relative box-border w-full rounded-t-md border-b p-1`}
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
          <p className="overflow-hidden text-sm overflow-ellipsis whitespace-nowrap">{properties.data.name}</p>
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
        {(properties.data.children.length > 0 || dragOver || canDropDraggedElement) && (
          <div className="w-full p-4">
            <div className="border-border bg-background w-full rounded-md p-4 shadow-[inset_0px_2px_4px_rgba(0,0,0,0.1)]">
              {properties.data.children.map((child) => (
                <div key={child.id} data-child-id={child.id} className="child-drop-zone">
                  <ChildNodeComponent
                    child={child}
                    gradientEnabled={gradientEnabled}
                    onEdit={editChild}
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
            </div>
          </div>
        )}
        {/* Show missing mandatory children if the node is missing any */}
        <MissingRequirements missingChildren={missingChildren} isFulfilled={mandatoryChildrenFulfilled} />

        {possibleChildren.length > 0 && (
          <div
            className="hover:text-foreground-active text-foreground/30 flex cursor-pointer gap-1 self-start p-1"
            onClick={() => setIsModalOpen(true)}
          >
            <div className="bg-foreground/30 border-border h-4 w-4 justify-center rounded-full border text-center text-[8px] font-bold">
              +
            </div>
            <p className="text-xs">Add a subcomponent</p>
          </div>
        )}

        {isOverflowing && (
          <div
            className="pointer-events-none absolute right-0 bottom-0 left-0 flex items-end justify-center pb-1"
            style={{
              height: '28px',
              background: 'linear-gradient(to bottom, transparent, var(--color-background))',
            }}
          >
            <span className="text-foreground-muted text-[9px] leading-none">▼ more</span>
          </div>
        )}
      </div>

      {/* Receivers can only have outgoing connections, so we hide the input handle for them */}
      {frankElement?.name && frankElement.name !== 'Receiver' && (
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
      )}
      {properties.data.sourceHandles.map((handle) => (
        <CustomHandle
          key={handle.type + handle.index}
          type={handle.type}
          index={handle.index}
          firstHandlePosition={firstHandlePosition}
          handleSpacing={handleSpacing}
          onChangeType={(newType) => changeHandleType(handle.index, newType)}
          absolutePosition={{ x: properties.positionAbsoluteX, y: properties.positionAbsoluteY }}
          typesAllowed={frankElement?.forwards}
        />
      ))}
      {/* Only show the add handle button if there are available handle types that are not yet used on this node */}
      {!allForwardTypesUsed && (
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
      )}
      {isHandleMenuOpen && (
        <HandleMenu
          title="Select Handle Type"
          position={handleMenuPosition}
          onClose={() => setIsHandleMenuOpen(false)}
          onSelect={handleMenuClick}
          typesAllowed={frankElement?.forwards}
        />
      )}

      {/* Modal */}
      <AddSubcomponentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        possibleChildren={possibleChildren}
        onAddChild={createChildFromElement}
      />
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
