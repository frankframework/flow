import { create } from 'zustand'
import type { StateCreator } from 'zustand/vanilla'
import { createCanvasSlice, type CanvasSliceState } from '~/stores/flow-store/flow-store-canvas'
import { createReactFlowSlice, type ReactFlowSliceState } from '~/stores/flow-store/flow-store-reactflow'

export type SharedSliceState = {
  resetStore: () => void
}

const createSharedSlice: StateCreator<ReactFlowSliceState & CanvasSliceState, [], [], SharedSliceState> = (
  set,
) => ({
  resetStore(): void {
    set({
      nodes: [],
      edges: [],
      history: [],
      historyIndex: -1,
    })
  },
})

const useFlowStore = create<ReactFlowSliceState & CanvasSliceState & SharedSliceState>((...modifiers) => ({
  ...createReactFlowSlice(...modifiers),
  ...createCanvasSlice(...modifiers),
  ...createSharedSlice(...modifiers),
}))

export default useFlowStore
