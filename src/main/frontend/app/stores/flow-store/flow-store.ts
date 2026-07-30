import { create } from 'zustand'
import type { StateCreator } from 'zustand/vanilla'
import { createCanvasSlice, type CanvasSliceState } from '~/stores/flow-store/flow-store-canvas'
import { createReactFlowSlice, type ReactFlowSliceState } from '~/stores/flow-store/flow-store-reactflow'

export type SharedSliceState = {
  undo: () => void
  redo: () => void
}

const createSharedSlice: StateCreator<ReactFlowSliceState & CanvasSliceState, [], [], SharedSliceState> = (
  set,
  get,
) => ({
  undo(steps = 1): void {
    const { history, historyIndex, setHistoryIndex } = get()
    const historyPosition = historyIndex === -1 ? history.length - 1 : historyIndex
    if (historyPosition < steps) steps = historyPosition
    if (steps < 1) return

    // TODO undo react flow state using each snapshot step in history
    setHistoryIndex(historyPosition - steps)
  },
  redo(steps = 1): void {
    const { history, historyIndex, setHistoryIndex } = get()
    if (historyIndex === -1) return
    const maxIndex = history.length - 1
    if (historyIndex + steps > maxIndex) steps = maxIndex - historyIndex

    // TODO redo react flow state using each snapshot step in history
    setHistoryIndex(historyIndex + steps)
  },
})

const useFlowStore = create<ReactFlowSliceState & CanvasSliceState & SharedSliceState>((...modifiers) => ({
  ...createReactFlowSlice(...modifiers),
  ...createCanvasSlice(...modifiers),
  ...createSharedSlice(...modifiers),
}))

export default useFlowStore
