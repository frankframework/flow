import { create } from 'zustand'
import type { Attribute } from '~/types/ff-doc.types'

interface NodeContextStore {
  attributes: Record<string, Attribute> | undefined
  nodeId: number
  isEditing: boolean
  parentId: string | null
  childParentId: string | null
  draggedName: string | null
  setNodeId: (nodeId: number) => void
  setAttributes: (attributes?: Record<string, Attribute>) => void
  setIsEditing: (value: boolean) => void
  resetAttributes: () => void
  setParentId: (id: string | null) => void
  setChildParentId: (id: string | null) => void
  setDraggedName: (name: string | null) => void
}

const useNodeContextStore = create<NodeContextStore>((set) => ({
  attributes: undefined,
  nodeId: 0,
  isEditing: false,
  parentId: null,
  childParentId: null,
  draggedName: null,
  setNodeId: (nodeId) => set({ nodeId }),
  setAttributes: (attributes) => set({ attributes }),
  setIsEditing: (value) => set({ isEditing: value }),
  resetAttributes: () => set({ attributes: undefined }),
  setParentId: (parentId: string | null) => set({ parentId }),
  setChildParentId: (childParentId: string | null) => set({ childParentId }),
  setDraggedName: (draggedName) => set({ draggedName }),
}))

export default useNodeContextStore
