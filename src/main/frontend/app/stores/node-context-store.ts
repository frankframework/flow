import { create } from 'zustand'

interface NodeContextStore {
  attributes: any
  nodeId: number
  isEditing: boolean
  parentId: string | null
  childParentId: string | null
  setNodeId: (nodeId: number) => void
  setAttributes: (attributes: any[]) => void
  setIsEditing: (value: boolean) => void
  resetAttributes: () => void
  setParentId: (id: string | null) => void
  setChildParentId: (id: string | null) => void
}

const useNodeContextStore = create<NodeContextStore>((set) => ({
  attributes: [{ name: 'placeholder attribute' }, { param: 'placeholder attribute' }],
  nodeId: 0,
  isEditing: false,
  parentId: null,
  childParentId: null,
  setNodeId: (nodeId) => set({ nodeId }),
  setAttributes: (attributes) => set({ attributes }),
  setIsEditing: (value) => set({ isEditing: value }),
  resetAttributes: () => set({ attributes: [] }),
  setParentId: (parentId: string | null) => set({ parentId }),
  setChildParentId: (childParentId: string | null) => set({ childParentId }),
}))

export default useNodeContextStore
