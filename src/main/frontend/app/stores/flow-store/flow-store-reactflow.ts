import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type OnConnect,
  type OnReconnect,
} from '@xyflow/react'
import type { StateCreator } from 'zustand/vanilla'
import type { FlowNode } from '~/routes/studio/canvas-flow/canvas-flow'
import type { CanvasSliceState } from '~/stores/flow-store/flow-store-canvas'
import { getEdgeLabelFromHandle } from '~/utils/flow-utils'

export type ReactFlowSliceState<NodeType extends Node = Node, EdgeType extends Edge = Edge> = {
  nodes: NodeType[]
  edges: EdgeType[]
  _onNodesChange: (changes: NodeChange<FlowNode>[]) => void
  _onEdgesChange: (changes: EdgeChange<Edge>[]) => void
  _onConnect: OnConnect
  _onReconnect: OnReconnect
}

export const createReactFlowSlice: StateCreator<ReactFlowSliceState & CanvasSliceState, [], [], ReactFlowSliceState> = (
  set,
  get,
): ReactFlowSliceState => ({
  nodes: [],
  edges: [],
  _onNodesChange: (changes): void => {
    const state = get()

    const dragStart = changes.some(
      (change) => change.type === 'position' && 'dragging' in change && change.dragging === true && !state.isDragging,
    )
    const dragEnd = changes.some(
      (change) => change.type === 'position' && 'dragging' in change && change.dragging === false,
    )
    const resizeStart = changes.some(
      (change) => change.type === 'dimensions' && 'resizing' in change && change.resizing === true && !state.isResizing,
    )
    const resizeEnd = changes.some(
      (change) => change.type === 'dimensions' && 'resizing' in change && change.resizing === false,
    )
    let nextIsDragging = state.isDragging
    let nextIsResizing = state.isResizing

    if (dragStart) nextIsDragging = true
    if (dragEnd) nextIsDragging = false

    if (resizeStart) nextIsResizing = true
    if (resizeEnd) nextIsResizing = false

    const movedNodeIds = new Set(
      changes.filter((nodeChange) => nodeChange.type === 'position').map((nodeChangePosition) => nodeChangePosition.id),
    )

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

    set(() => ({ nodes, isDragging: nextIsDragging, isResizing: nextIsResizing }))
  },
  _onEdgesChange: (changes): void => {
    // TODO why not type === 'add' as well?
    // const structuralChange = changes.some((change) => change.type === 'remove')
    //
    // if (structuralChange) {
    //   saveToHistory()
    // }

    set((state) => ({ edges: applyEdgeChanges(changes, state.edges) }))
  },
  _onConnect: (connection): void => {
    const { nodes, edges } = get()
    const sourceNode = nodes.find((node) => node.id === connection.source)
    const label = getEdgeLabelFromHandle(sourceNode, connection.sourceHandle)

    if (wouldCreateDuplicateForward(edges, connection.source, connection.target, label)) return

    set({ edges: addEdge({ ...connection, type: 'frankEdge', data: { label } }, edges) })
  },
  _onReconnect: (oldEdge, newConnection): void => {
    const { nodes, edges } = get()
    const sourceNode = nodes.find((node) => node.id === newConnection.source)
    const label = getEdgeLabelFromHandle(sourceNode, newConnection.sourceHandle)

    const edgesWithoutOld = edges.filter((edge) => edge.id !== oldEdge.id)
    if (wouldCreateDuplicateForward(edgesWithoutOld, newConnection.source, newConnection.target, label)) return

    set({
      edges: [...edgesWithoutOld, { ...newConnection, id: oldEdge.id, type: 'frankEdge', data: { label } }],
    })
  },
})

function wouldCreateDuplicateForward(edges: Edge[], source: string, target: string, label: string): boolean {
  // TODO create edge type so that data isn't unknown
  return edges.some((edge) => edge.source === source && edge.target === target && edge.data?.label === label)
}
