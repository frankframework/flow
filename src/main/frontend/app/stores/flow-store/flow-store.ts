import type { Edge, EdgeChange, NodeChange, OnConnect, OnReconnect } from '@xyflow/react'
import { create } from 'zustand'
import type { StateCreator } from 'zustand/vanilla'
import type { FlowNode } from '~/routes/studio/canvas-flow/canvas-flow'
import { createCanvasSlice, type CanvasSliceState } from '~/stores/flow-store/flow-store-canvas'
import { createReactFlowSlice, type ReactFlowSliceState } from '~/stores/flow-store/flow-store-reactflow'

export type SharedSliceState = {
  undo: (steps?: number) => void
  redo: (steps?: number) => void
  resetStore: () => void
  onNodesChange: (changes: NodeChange<FlowNode>[]) => void
  onEdgesChange: (changes: EdgeChange<Edge>[]) => void
  onConnect: OnConnect
  onReconnect: OnReconnect
}

const createSharedSlice: StateCreator<ReactFlowSliceState & CanvasSliceState, [], [], SharedSliceState> = (
  set,
  get,
) => ({
  onNodesChange(changes): void {
    const { _onNodesChange } = get()
    _onNodesChange(changes)
    // TODO save to history
  },
  onEdgesChange(changes): void {
    const { _onEdgesChange } = get()
    _onEdgesChange(changes)
    // TODO save to history
  },
  onConnect(connection): void {
    const { _onConnect } = get()
    _onConnect(connection)
    // TODO save to history
  },
  onReconnect(oldEdge, newConnection): void {
    const { _onReconnect } = get()
    _onReconnect(oldEdge, newConnection)
    // TODO save to history
  },
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
