import type { Edge, Node, NodeChange } from '@xyflow/react'
import type { StateCreator } from 'zustand/vanilla'
import type { CanvasSliceState } from '~/stores/flow-store/flow-store-canvas'

export type ReactFlowSliceState<NodeType extends Node = Node, EdgeType extends Edge = Edge> = {
  nodes: NodeType[]
  edges: EdgeType[]
  onNodesChange: () => void
  onEdgesChange: () => void
  handleConnect: () => void
  onReconnect: () => void
  handleNodeClick: () => void
  handleNodeDoubleClick: () => void
  handleNodeMouseEnter: () => void
  handleNodeMouseLeave: () => void
  handleNodeDragStop: () => void
  handleEdgeClick: () => void
  handleSelectionChange: () => void
  handleConnectStart: () => void
  handleConnectEnd: () => void
  nodeTypes: () => void
  edgeTypes: () => void
}

export const createReactFlowSlice: StateCreator<
  ReactFlowSliceState & CanvasSliceState,
  [],
  [],
  ReactFlowSliceState
> = (): ReactFlowSliceState => ({
  nodes: [],
  edges: [],
  onNodesChange: (changes: NodeChange<FlowNode>[]): void => {
    const state = get()

    // Drag detection
    const dragStart = changes.some(
      (change) => change.type === 'position' && 'dragging' in change && change.dragging === true && !state.isDragging,
    )

    const dragEnd = changes.some(
      (change) => change.type === 'position' && 'dragging' in change && change.dragging === false,
    )

    // Detect resize start
    const resizeStart = changes.some(
      (change) => change.type === 'dimensions' && 'resizing' in change && change.resizing === true && !state.isResizing,
    )

    const resizeEnd = changes.some(
      (change) => change.type === 'dimensions' && 'resizing' in change && change.resizing === false,
    )

    // Logic that runs when a drag/resize starts or ends. We want to save to history at the start of a drag or resize, but not on every position/dimension change during said action.
    if (dragStart || resizeStart) {
      state.saveToHistory()
    }
    let nextIsDragging = state.isDragging
    let nextIsResizing = state.isResizing

    if (dragStart) nextIsDragging = true
    if (dragEnd) nextIsDragging = false

    if (resizeStart) nextIsResizing = true
    if (resizeEnd) nextIsResizing = false

    const movedNodeIds = new Set(
      changes.filter((nodeChange) => nodeChange.type === 'position').map((nodeChangePosition) => nodeChangePosition.id),
    )

    set((state) => {
      const updatedNodes = applyNodeChanges(changes, state.nodes)

      const nodes =
        movedNodeIds.size === 0
          ? updatedNodes
          : updatedNodes.map((node) => {
              if (!isStickyNote(node) || !node.data.attachedToNodeId) return node

              if (movedNodeIds.has(node.data.attachedToNodeId)) {
                const parent = updatedNodes.find((updatedNode) => updatedNode.id === node.data.attachedToNodeId)
                if (!parent) return node
                return {
                  ...node,
                  position: {
                    x: parent.position.x + (node.data.offsetX ?? 0),
                    y: parent.position.y + (node.data.offsetY ?? 0),
                  },
                }
              }

              if (dragEnd && movedNodeIds.has(node.id)) {
                const parent = updatedNodes.find((updatedNode) => updatedNode.id === node.data.attachedToNodeId)
                if (!parent) return node
                return {
                  ...node,
                  data: {
                    ...node.data,
                    offsetX: node.position.x - parent.position.x,
                    offsetY: node.position.y - parent.position.y,
                  },
                }
              }

              return node
            })

      return { nodes, isDragging: nextIsDragging, isResizing: nextIsResizing }
    })
  },
  onEdgesChange: (): void => {},
  handleConnect: (): void => {},
  onReconnect: (): void => {},
  handleNodeClick: (): void => {},
  handleNodeDoubleClick: (): void => {},
  handleNodeMouseEnter: (): void => {},
  handleNodeMouseLeave: (): void => {},
  handleNodeDragStop: (): void => {},
  handleEdgeClick: (): void => {},
  handleSelectionChange: (): void => {},
  handleConnectStart: (): void => {},
  handleConnectEnd: (): void => {},
  nodeTypes: (): void => {},
  edgeTypes: (): void => {},
})
