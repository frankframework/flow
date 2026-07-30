import type { StateCreator } from 'zustand/vanilla'
import type { ReactFlowSliceState } from '~/stores/flow-store/flow-store-reactflow'

export type HistoryStep = Partial<CanvasSliceState & ReactFlowSliceState>

export type CanvasSliceState = {
  history: HistoryStep[]
  addHistory: (history: HistoryStep) => void
  historyIndex: number
  setHistoryIndex: (historyIndex: number) => void
}

export const createCanvasSlice: StateCreator<ReactFlowSliceState & CanvasSliceState, [], [], CanvasSliceState> = (
  set,
): CanvasSliceState => ({
  history: [],
  addHistory: (step: HistoryStep): void => set((state) => ({ history: [...state.history, step] })),
  historyIndex: -1,
  setHistoryIndex: (historyIndex: number): void => {
    if (historyIndex >= -1) set({ historyIndex })
  },
})
