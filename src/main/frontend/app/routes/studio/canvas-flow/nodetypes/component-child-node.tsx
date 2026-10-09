import { type JSX, type DragEvent, useCallback, useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import type { ComponentNodeData } from '~/routes/studio/canvas-flow/nodetypes/component-node'
import useFlowStore from '~/stores/flow-store/flow-store'
import { getElementTypeFromName } from '../../node-translator-module'
import useNodeContextStore from '~/stores/node-context-store'
import { useNodeContextMenu } from '../node-context-menu-context'
import { useFrankConfigXsd } from '~/providers/frankconfig-xsd-provider'
import { getAllowedChildElementsForElement } from '~/utils/xsd-utils'
import { NodeHeader } from './components/node-header'

export type ComponentChildNodeComponentProperties = {
  children: ComponentNodeData[]
  dragOver: boolean
  canDropDraggedElement: boolean
}

export function ComponentChildNodeComponent(properties: Readonly<ComponentNodeData>): JSX.Element {
  const {
    setParentId,
    setChildParentId,
    setIsEditing,
    setDraggedName,
    draggedName,
    setNodeId,
    setAttributes,
    nodeId,
    parentId: selectedParentId,
    isDirty,
  } = useNodeContextStore()
  const isSelected = nodeId === +properties.id && selectedParentId !== null
  const showNodeContextMenu = useNodeContextMenu()
  const [dragOver, setDragOver] = useState(false)
  const [canDropDraggedElement, setCanDropDraggedElement] = useState(false)
  const [dragForbidden, setDragForbidden] = useState(false)
  const { xsdDoc } = useFrankConfigXsd()

  const allowedChildNames = useMemo(
    (): Set<string> | null => (xsdDoc ? new Set(getAllowedChildElementsForElement(xsdDoc, properties.subtype)) : null),
    [xsdDoc, properties.subtype],
  )

  const handleDragOver = (event: DragEvent): void => {
    event.preventDefault()
    event.stopPropagation()

    const raw = event.dataTransfer.getData('application/reactflow')
    if (!raw) {
      setDragOver(false)
      return
    }

    const dropped = JSON.parse(raw)
    const allowed = canAcceptChild(dropped.name)

    // If we are dragging over a nested ChildNode, do NOT show the drop zone
    const nestedNode = (event.target as HTMLElement).closest('[data-childnode-id]')
    const isThisNode = nestedNode instanceof HTMLElement && nestedNode.dataset.childnodeId === properties.id

    event.dataTransfer.dropEffect = allowed ? 'copy' : 'none'

    if (isThisNode) {
      setDragForbidden(!allowed)
      setDragOver(allowed)
    }
  }

  const handleDragLeave = (): void => {
    setDragOver(false)
    setDragForbidden(false)
  }

  const canAcceptChild = useCallback(
    (droppedName: string): boolean => allowedChildNames?.has(droppedName) ?? false,
    [allowedChildNames],
  )

  const handleDrop = useCallback(
    (event: React.DragEvent): void => {
      event.preventDefault()
      event.stopPropagation()
      setDragOver(false)
      setDragForbidden(false)
      setDraggedName(null)

      const raw = event.dataTransfer.getData('application/reactflow')
      if (!raw) return

      const dropped = JSON.parse(raw)
      if (!canAcceptChild(dropped.name)) {
        console.warn(`Rejected drop: ${dropped.name} is not allowed as child of ${properties.subtype}`)
        return
      }

      const newId = useFlowStore.getState().getNextNodeId()
      setNodeId(+newId)
      setAttributes(dropped.attributes)
      showNodeContextMenu(true)
      setIsEditing(true)
      setParentId(rootId)
      setChildParentId(parentId)

      const newChild: ComponentNodeData = {
        id: newId,
        subtype: dropped.name,
        type: getElementTypeFromName(dropped.name),
        name: '',
        attributes: {},
        children: [],
      }

      // Add child recursively
      addChildToChild(rootId, child.id, newChild)
    },
    [
      setDraggedName,
      canAcceptChild,
      setNodeId,
      setAttributes,
      showNodeContextMenu,
      setIsEditing,
      setParentId,
      rootId,
      setChildParentId,
      parentId,
      addChildToChild,
      child.id,
      child.subtype,
    ],
  )

  useEffect((): void => {
    setCanDropDraggedElement(draggedName !== null && canAcceptChild(draggedName))
  }, [draggedName, canAcceptChild])

  return (
    <div
      data-childnode-id={properties.id}
      className={clsx(
        'bg-background relative mr-0.5 mb-2 rounded-md border shadow-md',
        isSelected && 'border-1',
        !isSelected && dragForbidden && 'border-2 border-dashed',
        !isSelected && !dragForbidden && 'border-border',
      )}
      style={isSelected ? { borderColor: `var(--type-${properties.type?.toLowerCase()})` } : undefined}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={(mouseEvent): void => {
        mouseEvent.stopPropagation()
        if (isDirty) return
        onSelect(properties.id)
      }}
      onDoubleClick={(event): void => {
        event.stopPropagation()
        if (isDirty) return
        onEdit(properties.id)
      }}
    >
      {/* Header */}
      <NodeHeader
        subtype={properties.subtype}
        name={properties.name}
        colorVariable={`--type-${properties.type?.toLowerCase()}`}
        gradientEnabled={gradientEnabled}
      />

      {/* Body */}
      <div className="child-node-body border-border/40 relative min-h-25 rounded-b-md border px-1 py-1">
        {properties.attributes &&
          Object.entries(properties.attributes).map(([key, value]): JSX.Element => (
            <div key={key} className="my-1 min-w-0">
              <p className="overflow-hidden text-sm font-bold text-ellipsis whitespace-nowrap">{key}</p>
              <p className="overflow-hidden text-sm text-ellipsis whitespace-nowrap">{value}</p>
            </div>
          ))}

        <ComponentChildrenComponent
          children={properties.children}
          dragOver={dragOver}
          canDropDraggedElement={canDropDraggedElement}
        />
      </div>
    </div>
  )
}

export default function ComponentChildrenComponent(
  properties: Readonly<ComponentChildNodeComponentProperties>,
): JSX.Element {
  const { children, dragOver, canDropDraggedElement } = properties

  if (!children || (!dragOver && !canDropDraggedElement && children.length === 0)) {
    return <></>
  }

  return (
    <div className="w-full min-w-0 p-4">
      <div className="border-border/40 bg-background w-full rounded-md border p-4 inset-shadow-sm">
        {children.map((child) => (
          <div key={child.id} data-child-id={child.id} className="child-drop-zone">
            <ComponentChildNodeComponent {...child} />
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
  )
}
