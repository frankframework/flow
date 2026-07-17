import type { Attribute } from '@frankframework/doc-library-core'
import { create } from 'zustand'

type NodeContextStore = {
  attributes: Record<string, Attribute> | undefined
  nodeId: number
  isEditing: boolean
  isNewNode: boolean
  isDirty: boolean
  parentId: string | null
  childParentId: string | null
  draggedName: string | null
  editingSubtype: string | null
  allowedOnCanvas: boolean
  dropSuccessful: boolean
  isMultiSelect: boolean
  selectedStickyId: string | null
  selectedGroupId: string | null
  saveFlow: (() => Promise<void>) | null
  hoveredNodeId: string | null
  showAllForwards: boolean
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
  registerSaveFlow: (function_: (() => Promise<void>) | null) => void
  setAllowedOnCanvas: (allowed: boolean) => void
  setDropSuccessful: (successful: boolean) => void
  setIsMultiSelect: (value: boolean) => void
  setSelectedStickyId: (id: string | null) => void
  setSelectedGroupId: (id: string | null) => void
  setHoveredNodeId: (id: string | null) => void
  setShowAllForwards: (value: boolean) => void
  toggleShowAllForwards: () => void
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
  allowedOnCanvas: false,
  dropSuccessful: false,
  isMultiSelect: false,
  selectedStickyId: null,
  selectedGroupId: null,
  saveFlow: null,
  hoveredNodeId: null,
  showAllForwards: false,
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
  setAllowedOnCanvas: (allowedOnCanvas) => set({ allowedOnCanvas }),
  setDropSuccessful: (dropSuccessful) => set({ dropSuccessful }),
  setIsMultiSelect: (isMultiSelect) => set({ isMultiSelect }),
  setSelectedStickyId: (selectedStickyId) => set({ selectedStickyId }),
  setSelectedGroupId: (selectedGroupId) => set({ selectedGroupId }),
  setHoveredNodeId: (id) => set((state) => (state.hoveredNodeId === id ? state : { hoveredNodeId: id })),
  setShowAllForwards: (showAllForwards) => set({ showAllForwards }),
  toggleShowAllForwards: () => set((state) => ({ showAllForwards: !state.showAllForwards })),
}))

export default useNodeContextStore
