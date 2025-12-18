import { useCallback, useEffect, useMemo, useState } from 'react'
import useFlowStore from '~/stores/flow-store'
import { getElementTypeFromName } from '../../node-translator-module'
import useNodeContextStore from '~/stores/node-context-store'
import { useNodeContextMenu } from '../flow'
import { canAcceptChildStatic, type FrankElement } from './node-utilities'
import variables from 'environment/environment'
import { useFFDoc } from '@frankframework/ff-doc/react'

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
  parentId: string
  rootId: string
}

export function ChildNodeComponent({
  child,
  gradientEnabled,
  onEdit,
  parentId,
  rootId,
}: Readonly<ChildNodeProperties>) {
  const { setParentId, setChildParentId, setIsEditing, setDraggedName, draggedName } = useNodeContextStore()
  const showNodeContextMenu = useNodeContextMenu()
  const addChildToChild = useFlowStore((state) => state.addChildToChild)
  const [dragOver, setDragOver] = useState(false)
  const [canDropDraggedElement, setCanDropDraggedElement] = useState(false)
  const [dragForbidden, setDragForbidden] = useState(false)
  const FRANK_DOC_URL = variables.frankDocJsonUrl
  const { elements, filters } = useFFDoc(FRANK_DOC_URL)
  // Store the associated Frank element
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

    if (!allowed && isThisNode) {
      setDragForbidden(true)
      setDragOver(false)
    } else if (allowed && isThisNode) {
      setDragForbidden(false)
      setDragOver(true)
    }
  }

  const handleDragLeave = () => {
    setDragOver(false)
    setDragForbidden(false)
  }

  const canAcceptChild = useCallback(
    (droppedName: string) => {
      return canAcceptChildStatic(frankElement as FrankElement | null, droppedName, filters)
    },
    [frankElement, filters],
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
    if (!draggedName) {
      setCanDropDraggedElement(false)
      return
    }

    const allowed = canAcceptChild(draggedName)

    if (allowed) {
      setCanDropDraggedElement(true)
      return
    }
    setCanDropDraggedElement(false)
  }, [draggedName, canAcceptChild, frankElement, child.subtype])

  return (
    <div
      data-childnode-id={child.id}
      className={`bg-background relative mr-0.5 mb-2 rounded-md border ${dragForbidden ? 'border-2 border-dashed' : 'border-border'}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onDoubleClick={(event) => {
        event.stopPropagation()
        onEdit(child.id)
      }}
    >
      {/* Header */}
      <div
        className="border-border rounded-t-md border-b p-1"
        style={{
          background: gradientEnabled
            ? `radial-gradient(
              ellipse farthest-corner at 20% 20%,
              var(--type-${child.type?.toLowerCase()}) 0%,
              var(--color-background) 100%
            )`
            : `var(--type-${child.type?.toLowerCase()})`,
        }}
      >
        <h1 className="font-bold">{child.subtype}</h1>
        <p className="overflow-hidden text-sm whitespace-nowrap">{child.name?.toUpperCase()}</p>
      </div>

      {/* Body */}
      <div className="child-node-body relative min-h-[100px] px-1 py-1">
        {child.attributes &&
          Object.entries(child.attributes).map(([key, value]) => (
            <div key={key} className="my-1">
              <p className="text-sm font-bold">{key}</p>
              <p className="text-sm">{value}</p>
            </div>
          ))}

        {/* Recursive children */}
        {child.children && child.children.length > 0 && (
          <div className="relative mt-2 pl-4">
            {child.children.map((nested) => (
              <ChildNodeComponent
                key={nested.id}
                child={nested}
                gradientEnabled={gradientEnabled}
                onEdit={onEdit}
                parentId={child.id}
                rootId={rootId}
              />
            ))}
          </div>
        )}

        {/* Drop zone */}
        {dragOver && (
          <div className="mt-2 pl-4">
            <div
              className="border-foreground-muted bg-foreground-muted/20 flex items-center justify-center border-2 border-dashed text-center text-xs italic"
              style={{
                height: '100px',
                width: '100%',
                borderRadius: '6px',
              }}
            >
              Drop to add child
            </div>
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
