import type { StateCreator } from 'zustand/vanilla'
import type { ReactFlowSliceState } from '~/stores/flow-store/flow-store-reactflow'
import type { FlowHistory, FlowHistoryStep } from '~/utils/diff'

export type CanvasSliceState = {
  history: FlowHistory
  addHistory: (history: FlowHistoryStep) => void
  historyIndex: number
  setHistoryIndex: (historyIndex: number) => void
}

export const createCanvasSlice: StateCreator<ReactFlowSliceState & CanvasSliceState, [], [], CanvasSliceState> = (
  set,
): CanvasSliceState => ({
  history: [],
  addHistory: (step: FlowHistoryStep): void => set((state) => ({ history: [...state.history, step] })),
  historyIndex: -1,
  setHistoryIndex: (historyIndex: number): void => {
    if (historyIndex >= -1) set({ historyIndex })
  },
})
