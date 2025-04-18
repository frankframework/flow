import { create } from 'zustand'

interface NodeContextStore {
  attributes: any
  nodeId: number
  setNodeId: (nodeId: number) => void
  setAttributes: (attributes: any[]) => void
  resetAttributes: () => void
}

const useNodeContextStore = create<NodeContextStore>((set) => ({
  attributes: [{ name: 'placeholder attribute' }, { param: 'placeholder attribute' }],
  nodeId: 0,
  setNodeId: (nodeId) => set({ nodeId }),
  setAttributes: (attributes) => set({ attributes }),
  resetAttributes: () => set({ attributes: [] }),
}))

export default useNodeContextStore
