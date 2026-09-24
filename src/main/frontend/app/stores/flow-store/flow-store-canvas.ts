import type { StateCreator } from 'zustand/vanilla'
import type { ReactFlowSliceState } from '~/stores/flow-store/flow-store-reactflow'
import { type FlowHistory, type FlowHistoryStep } from '~/utils/diff'
export type CanvasSliceState = {
  history: FlowHistory
  historyIndex: number
  addHistory: (history: FlowHistoryStep) => void
  setHistoryIndex: (historyIndex: number) => void
  undo: (steps?: number) => void
  redo: (steps?: number) => void
}

export const createCanvasSlice: StateCreator<ReactFlowSliceState & CanvasSliceState, [], [], CanvasSliceState> = (
  set,
  get,
): CanvasSliceState => ({
  history: [],
  historyIndex: -1,
  addHistory: (step: FlowHistoryStep): void => set((state) => ({ history: [...state.history, step] })),
  setHistoryIndex: (historyIndex: number): void => {
    if (historyIndex >= -1) set({ historyIndex })
  },
  undo(steps = 1): void {
    const { history, historyIndex, setHistoryIndex } = get()
    const historyPosition = historyIndex === -1 ? history.length - 1 : historyIndex
    if (historyPosition < steps) steps = historyPosition
    if (steps < 1) return

    /* TODO undo react flow state using each snapshot step in history
       diffpatch.unpatch(state, history[historyPosition]) */
    setHistoryIndex(historyPosition - steps)
  },
  redo(steps = 1): void {
    const { history, historyIndex, setHistoryIndex } = get()
    if (historyIndex === -1) return
    const maxIndex = history.length - 1
    if (historyIndex + steps > maxIndex) steps = maxIndex - historyIndex

    /* TODO redo react flow state using each snapshot step in history
       diffpatch.patch(state, history[historyIndex + 1]) */
    setHistoryIndex(historyIndex + steps)
  },
})
