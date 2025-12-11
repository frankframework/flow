import { useCallback, useState } from 'react'
import useFlowStore from '~/stores/flow-store'
import { getElementTypeFromName } from '../../node-translator-module'
import useNodeContextStore from '~/stores/node-context-store'
import { useNodeContextMenu } from '../flow'

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

export function ChildNode({ child, gradientEnabled, onEdit, parentId, rootId }: Readonly<ChildNodeProperties>) {
  const { setParentId, setChildParentId, setIsEditing } = useNodeContextStore()
  const showNodeContextMenu = useNodeContextMenu()
  const addChildToChild = useFlowStore((state) => state.addChildToChild)
  const [dragOver, setDragOver] = useState(false)

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()

    const target = event.target as HTMLElement

    // Find the nearest body element
    const closestBody = target.closest('.child-node-body')

    // If the closest body is not THIS body, user is dragging over a nested child
    if (closestBody !== event.currentTarget) {
      setDragOver(false)
      return
    }

    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      event.stopPropagation()
      setDragOver(false)
      showNodeContextMenu(true)
      setIsEditing(true)
      setParentId(rootId)
      setChildParentId(parentId)

      const raw = event.dataTransfer.getData('application/reactflow')
      if (!raw) return

      const dropped = JSON.parse(raw)
      const newId = useFlowStore.getState().getNextNodeId()

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
    [child.id, parentId, addChildToChild],
  )

  return (
    <div
      className="bg-background border-border relative mr-0.5 mb-2 rounded-md border"
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
      <div
        className="child-node-body relative min-h-[100px] px-1 py-1"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
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
              <ChildNode
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
              className="border-foreground-muted bg-foreground-muted/50 flex items-center justify-center border-2 border-dashed text-center text-xs italic"
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
      </div>
    </div>
  )
}
