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

const useNodeContextStore = create<NodeContextStore>(
  (
    set,
  ): {
    attributes: undefined
    nodeId: number
    isEditing: false
    isNewNode: false
    isDirty: false
    parentId: null
    childParentId: null
    draggedName: null
    editingSubtype: null
    allowedOnCanvas: false
    dropSuccessful: false
    isMultiSelect: false
    selectedStickyId: null
    selectedGroupId: null
    saveFlow: null
    hoveredNodeId: null
    showAllForwards: false
    setNodeId: (nodeId: number) => void
    setAttributes: (attributes: Record<string, Attribute> | undefined) => void
    setIsEditing: (value: boolean) => void
    setIsNewNode: (value: boolean) => void
    setIsDirty: (isDirty: boolean) => void
    resetAttributes: () => void
    setParentId: (parentId: string | null) => void
    setChildParentId: (childParentId: string | null) => void
    setDraggedName: (draggedName: string | null) => void
    setEditingSubtype: (editingSubtype: string | null) => void
    registerSaveFlow: (saveFlow: (() => Promise<void>) | null) => void
    setAllowedOnCanvas: (allowedOnCanvas: boolean) => void
    setDropSuccessful: (dropSuccessful: boolean) => void
    setIsMultiSelect: (isMultiSelect: boolean) => void
    setSelectedStickyId: (selectedStickyId: string | null) => void
    setSelectedGroupId: (selectedGroupId: string | null) => void
    setHoveredNodeId: (id: string | null) => void
    setShowAllForwards: (showAllForwards: boolean) => void
    toggleShowAllForwards: () => void
  } => ({
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
    setNodeId: (nodeId): void => set({ nodeId }),
    setAttributes: (attributes): void => set({ attributes }),
    setIsEditing: (value): void => set({ isEditing: value }),
    setIsNewNode: (value): void => set({ isNewNode: value }),
    setIsDirty: (isDirty): void => set({ isDirty }),
    resetAttributes: (): void => set({ attributes: undefined }),
    setParentId: (parentId: string | null): void => set({ parentId }),
    setChildParentId: (childParentId: string | null): void => set({ childParentId }),
    setDraggedName: (draggedName): void => set({ draggedName }),
    setEditingSubtype: (editingSubtype): void => set({ editingSubtype }),
    registerSaveFlow: (saveFlow): void => set({ saveFlow }),
    setAllowedOnCanvas: (allowedOnCanvas): void => set({ allowedOnCanvas }),
    setDropSuccessful: (dropSuccessful): void => set({ dropSuccessful }),
    setIsMultiSelect: (isMultiSelect): void => set({ isMultiSelect }),
    setSelectedStickyId: (selectedStickyId): void => set({ selectedStickyId }),
    setSelectedGroupId: (selectedGroupId): void => set({ selectedGroupId }),
    setHoveredNodeId: (id): void =>
      set((state): NodeContextStore | { hoveredNodeId: string | null } =>
        state.hoveredNodeId === id ? state : { hoveredNodeId: id },
      ),
    setShowAllForwards: (showAllForwards): void => set({ showAllForwards }),
    toggleShowAllForwards: (): void =>
      set((state): { showAllForwards: boolean } => ({ showAllForwards: !state.showAllForwards })),
  }),
)

export default useNodeContextStore
