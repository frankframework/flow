import { create } from 'zustand'
import {
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from '@xyflow/react'

import { initialNodes } from '~/routes/builder/canvas/nodes'
import { initialEdges } from '~/routes/builder/canvas/edges'
import type { FlowNode } from '~/routes/builder/canvas/flow'
import type { FrankNode } from '~/routes/builder/canvas/nodetypes/frank-node'
import type { ExitNode } from '~/routes/builder/canvas/nodetypes/exit-node';

export interface FlowState {
  nodes: FlowNode[]
  edges: Edge[]
  onNodesChange: OnNodesChange<FlowNode>
  onEdgesChange: OnEdgesChange
  onConnect: OnConnect
  setNodes: (nodes: FlowNode[]) => void
  setEdges: (edges: Edge[]) => void
  setAttributes: (nodeId: string, attributes: Record<string, string>) => void
  setNodeName: (nodeId: string, name: string) => void
  addHandle: (nodeId: string, handle: { type: string; index: number }) => void
}

function isFrankNode(node: FlowNode): node is FrankNode {
  return node.type === 'frankNode'
}

function isExitNode(node: FlowNode): node is ExitNode {
  return node.type === 'exitNode'
}

const useFlowStore = create<FlowState>((set, get) => ({
  nodes: initialNodes,
  edges: initialEdges,
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
    set({
      edges: addEdge(connection, get().edges),
    })
  },
  setNodes: (nodes) => {
    set({ nodes })
  },
  setEdges: (edges) => {
    set({ edges })
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
}))

export default useFlowStore
