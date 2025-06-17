import { create } from 'zustand'

interface NodeContextStore {
  attributes: any
  nodeId: number
  isEditing: boolean
  setNodeId: (nodeId: number) => void
  setAttributes: (attributes: any[]) => void
  setIsEditing: (value: boolean) => void
  resetAttributes: () => void
}

const useNodeContextStore = create<NodeContextStore>((set) => ({
  attributes: [{ name: 'placeholder attribute' }, { param: 'placeholder attribute' }],
  nodeId: 0,
  isEditing: false,
  setNodeId: (nodeId) => set({ nodeId }),
  setAttributes: (attributes) => set({ attributes }),
  setIsEditing: (value) => set({ isEditing: value }),
  resetAttributes: () => set({ attributes: [] }),
}))

export default useNodeContextStore
