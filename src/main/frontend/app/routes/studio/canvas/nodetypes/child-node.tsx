import { useCallback, useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import useFlowStore from '~/stores/flow-store'
import { getElementTypeFromName } from '../../node-translator-module'
import useNodeContextStore from '~/stores/node-context-store'
import { useNodeContextMenu } from '../node-context-menu-context'
import { canAcceptChildStatic, type FrankElement } from './node-utilities'
import { useFFDoc } from '@frankframework/doc-library-react'
import { NodeHeader } from './components/node-header'
import { NodeChildrenContainer } from './components/node-children-container'

export interface ChildNode {
  id: string
  subtype: string
  type: string
  name?: string
  attributes?: Record<string, string>

  children?: ChildNode[]
}

interface ChildNodeProperties {
  child: ChildNode
  gradientEnabled: boolean
  onEdit: (id: string) => void
  onSelect: (id: string) => void
  parentId: string
  rootId: string
}

export function ChildNodeComponent({
  child,
  gradientEnabled,
  onEdit,
  onSelect,
  parentId,
  rootId,
}: Readonly<ChildNodeProperties>) {
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
  const isSelected = nodeId === +child.id && selectedParentId !== null
  const showNodeContextMenu = useNodeContextMenu()
  const addChildToChild = useFlowStore((state) => state.addChildToChild)
  const [dragOver, setDragOver] = useState(false)
  const [canDropDraggedElement, setCanDropDraggedElement] = useState(false)
  const [dragForbidden, setDragForbidden] = useState(false)
  const { elements, filters, ffDoc } = useFFDoc()

  const frankElement = useMemo(() => {
    if (!elements) return null
    const recordElements = elements as Record<string, { name: string; [key: string]: unknown }>

    return Object.values(recordElements).find((element) => element.name === child.subtype) ?? null
  }, [elements, child.subtype])

  const handleDragOver = (event: React.DragEvent) => {
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
    const isThisNode = nestedNode instanceof HTMLElement && nestedNode.dataset.childnodeId === child.id

    event.dataTransfer.dropEffect = allowed ? 'copy' : 'none'

    if (isThisNode) {
      setDragForbidden(!allowed)
      setDragOver(allowed)
    }
  }

  const handleDragLeave = () => {
    setDragOver(false)
    setDragForbidden(false)
  }

  const canAcceptChild = useCallback(
    (droppedName: string) => {
      return canAcceptChildStatic(frankElement as FrankElement | null, droppedName, filters, ffDoc?.elements)
    },
    [frankElement, filters, ffDoc],
  )

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      event.stopPropagation()
      setDragOver(false)
      setDragForbidden(false)
      setDraggedName(null)

      const raw = event.dataTransfer.getData('application/reactflow')
      if (!raw) return

      const dropped = JSON.parse(raw)
      const newId = useFlowStore.getState().getNextNodeId()

      if (!canAcceptChild(dropped.name)) {
        console.warn(`Rejected drop: ${dropped.name} is not allowed as child of ${child.subtype}`)
        return
      }

      setNodeId(+newId)
      setAttributes(dropped.attributes)
      showNodeContextMenu(true)
      setIsEditing(true)
      setParentId(rootId)
      setChildParentId(parentId)

      const newChild: ChildNode = {
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

  useEffect(() => {
    setCanDropDraggedElement(draggedName !== null && canAcceptChild(draggedName))
  }, [draggedName, canAcceptChild, frankElement, child.subtype])

  return (
    <div
      data-childnode-id={child.id}
      className={clsx(
        'bg-background relative mr-0.5 mb-2 rounded-md border shadow-md',
        isSelected && 'border-1',
        !isSelected && dragForbidden && 'border-2 border-dashed',
        !isSelected && !dragForbidden && 'border-border',
      )}
      style={isSelected ? { borderColor: `var(--type-${child.type?.toLowerCase()})` } : undefined}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={(mouseEvent) => {
        mouseEvent.stopPropagation()
        if (isDirty) return
        onSelect(child.id)
      }}
      onDoubleClick={(event) => {
        event.stopPropagation()
        if (isDirty) return
        onEdit(child.id)
      }}
    >
      {/* Header */}
      <NodeHeader
        subtype={child.subtype}
        name={child.name}
        colorVariable={`--type-${child.type?.toLowerCase()}`}
        gradientEnabled={gradientEnabled}
      />

      {/* Body */}
      <div className="child-node-body border-border/40 relative min-h-25 rounded-b-md border px-1 py-1">
        {child.attributes &&
          Object.entries(child.attributes).map(([key, value]) => (
            <div key={key} className="my-1 min-w-0">
              <p className="overflow-hidden text-sm font-bold text-ellipsis whitespace-nowrap">{key}</p>
              <p className="overflow-hidden text-sm text-ellipsis whitespace-nowrap">{value}</p>
            </div>
          ))}

        {((child.children && child.children.length > 0) || dragOver || canDropDraggedElement) && (
          <NodeChildrenContainer className="mt-2">
            {child.children?.map((nested) => (
              <ChildNodeComponent
                key={nested.id}
                child={nested}
                gradientEnabled={gradientEnabled}
                onEdit={onEdit}
                onSelect={onSelect}
                parentId={child.id}
                rootId={rootId}
              />
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
        )}
      </div>
    </div>
  )
}
