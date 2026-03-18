import type { Attribute } from '@frankframework/doc-library-core'
import { create } from 'zustand'

interface NodeContextStore {
  attributes: Record<string, Attribute> | undefined
  nodeId: number
  isEditing: boolean
  isNewNode: boolean
  isDirty: boolean
  parentId: string | null
  childParentId: string | null
  draggedName: string | null
  editingSubtype: string | null
  saveFlow: (() => Promise<void>) | null
  setNodeId: (nodeId: number) => void
  setAttributes: (attributes?: Record<string, Attribute>) => void
  setIsEditing: (value: boolean) => void
  setIsNewNode: (value: boolean) => void
  setIsDirty: (v: boolean) => void
  resetAttributes: () => void
  setParentId: (id: string | null) => void
  setChildParentId: (id: string | null) => void
  setDraggedName: (name: string | null) => void
  setEditingSubtype: (subtype: string | null) => void
  registerSaveFlow: (fn: (() => Promise<void>) | null) => void
}

const useNodeContextStore = create<NodeContextStore>((set) => ({
  attributes: undefined,
  nodeId: 0,
  isEditing: false,
  isNewNode: false,
  isDirty: false,
  parentId: null,
  childParentId: null,
  draggedName: null,
  editingSubtype: null,
  saveFlow: null,
  setNodeId: (nodeId) => set({ nodeId }),
  setAttributes: (attributes) => set({ attributes }),
  setIsEditing: (value) => set({ isEditing: value }),
  setIsNewNode: (value) => set({ isNewNode: value }),
  setIsDirty: (isDirty) => set({ isDirty }),
  resetAttributes: () => set({ attributes: undefined }),
  setParentId: (parentId: string | null) => set({ parentId }),
  setChildParentId: (childParentId: string | null) => set({ childParentId }),
  setDraggedName: (draggedName) => set({ draggedName }),
  setEditingSubtype: (editingSubtype) => set({ editingSubtype }),
  registerSaveFlow: (saveFlow) => set({ saveFlow }),
}))

export default useNodeContextStore
