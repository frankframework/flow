import { create } from 'zustand'
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Edge,
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange,
  type OnReconnect,
} from '@xyflow/react'

import { initialNodes } from '~/routes/builder/canvas/nodes'
import { initialEdges } from '~/routes/builder/canvas/edges'
import type { FlowNode } from '~/routes/builder/canvas/flow'
import type { FrankNode } from '~/routes/builder/canvas/nodetypes/frank-node'
import type { ExitNode } from '~/routes/builder/canvas/nodetypes/exit-node'
import type { StickyNote } from '~/routes/builder/canvas/nodetypes/sticky-note'

export interface FlowState {
  nodes: FlowNode[]
  edges: Edge[]
  viewport: { x: number; y: number; zoom: number }
  nodeIdCounter: number
  onNodesChange: OnNodesChange<FlowNode>
  onEdgesChange: OnEdgesChange
  onConnect: OnConnect
  onReconnect: OnReconnect
  setNodes: (nodes: FlowNode[]) => void
  setEdges: (edges: Edge[]) => void
  setViewport: (viewport: { x: number; y: number; zoom: number }) => void
  getNextNodeId: () => string
  addNode: (newNode: FlowNode) => void
  deleteNode: (nodeId: string) => void
  deleteEdge: (edgeId: string) => void
  setAttributes: (nodeId: string, attributes: Record<string, string>) => void
  getAttributes: (nodeId: string) => Record<string, string> | null
  setStickyText: (nodeId: string, text: string) => void
  setNodeName: (nodeId: string, name: string) => void
  addHandle: (nodeId: string, handle: { type: string; index: number }) => void
  updateHandle: (nodeId: string, handleIndex: number, newHandle: { type: string; index: number }) => void
}

function isFrankNode(node: FlowNode): node is FrankNode {
  return node.type === 'frankNode'
}

function isExitNode(node: FlowNode): node is ExitNode {
  return node.type === 'exitNode'
}

function isStickyNote(node: FlowNode): node is StickyNote {
  return node.type === 'stickyNote'
}

const useFlowStore = create<FlowState>((set, get) => ({
  nodes: initialNodes,
  edges: initialEdges,
  viewport: { x: 0, y: 0, zoom: 1 },
  nodeIdCounter: initialNodes.length,
  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    })
  },
  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    })
  },
  onConnect: (connection) => {
    const newEdge = {
      ...connection,
      type: 'frankEdge',
    }
    set({
      edges: addEdge(newEdge, get().edges),
    })
  },
  onReconnect: (oldEdge, newConnection) => {
    set({
      edges: get()
        .edges.filter((edge) => edge.id !== oldEdge.id)
        .concat({
          ...newConnection,
          id: oldEdge.id,
          type: 'frankEdge',
        }),
    })
  },
  setNodes: (nodes) => {
    set({ nodes })
  },
  setEdges: (edges) => {
    set({ edges })
  },
  setViewport: (viewport) => {
    set({ viewport })
  },
  getNextNodeId: () => {
    const current = get().nodeIdCounter
    set({ nodeIdCounter: current + 1 })
    return current.toString()
  },
  addNode: (newNode: FlowNode) => {
    set({
      nodes: [...get().nodes, newNode],
    })
  },
  deleteNode: (nodeId: string) => {
    set({
      nodes: get().nodes.filter((node) => node.id !== nodeId),
      edges: get().edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
    })
  },
  deleteEdge: (edgeId: string) => {
    set({
      edges: get().edges.filter((edge) => edge.id !== edgeId),
    })
  },
  setAttributes: (nodeId, attributes) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === nodeId && isFrankNode(node)) {
          return {
            ...node,
            data: {
              ...node.data,
              attributes: attributes,
            },
          }
        }
        return node
      }),
    })
  },
  getAttributes: (nodeId: string) => {
    const node = get().nodes.find((node) => node.id === nodeId)
    if (node && isFrankNode(node)) {
      return node.data.attributes || null
    }
    return null
  },
  setStickyText: (nodeId, text) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === nodeId && isStickyNote(node)) {
          return {
            ...node,
            data: {
              ...node.data,
              content: text,
            },
          }
        }
        return node
      }),
    })
  },
  setNodeName: (nodeId, name) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === nodeId && (isFrankNode(node) || isExitNode(node))) {
          return {
            ...node,
            data: {
              ...node.data,
              name: name,
            },
          }
        }
        return node
      }),
    })
  },
  addHandle: (nodeId, handle) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === nodeId && isFrankNode(node)) {
          return {
            ...node,
            data: {
              ...node.data,
              sourceHandles: [...node.data.sourceHandles, handle],
            },
          }
        }
        return node
      }),
    })
  },
  updateHandle: (nodeId: string, handleIndex: number, newHandle: { type: string; index: number }) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === nodeId && isFrankNode(node)) {
          const updatedHandles = node.data.sourceHandles.map((handle) =>
            handle.index === handleIndex ? newHandle : handle,
          )
          return {
            ...node,
            data: {
              ...node.data,
              sourceHandles: updatedHandles,
            },
          }
        }
        return node
      }),
    })
  },
}))

export default useFlowStore
