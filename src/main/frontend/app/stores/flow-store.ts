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

import { initialNodes } from '~/routes/studio/canvas/nodes'
import { initialEdges } from '~/routes/studio/canvas/edges'
import type { FlowNode } from '~/routes/studio/canvas/flow'
import type { FrankNodeType } from '~/routes/studio/canvas/nodetypes/frank-node'
import type { ExitNode } from '~/routes/studio/canvas/nodetypes/exit-node'
import type { StickyNote } from '~/routes/studio/canvas/nodetypes/sticky-note'
import type { ChildNode } from '~/routes/studio/canvas/nodetypes/child-node'
import { addChildRecursive, deleteChildRecursive, updateChildRecursive } from './child-utilities'

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
  addChild: (nodeId: string, child: ChildNode) => void
  setStickyText: (nodeId: string, text: string) => void
  setNodeName: (nodeId: string, name: string) => void
  getNodeName: (nodeId: string) => string | null
  addHandle: (nodeId: string, handle: { type: string; index: number }) => void
  updateHandle: (nodeId: string, handleIndex: number, newHandle: { type: string; index: number }) => void
  updateChild: (parentNodeId: string, updatedChild: ChildNode) => void
  deleteChild: (parentId: string, childId: string) => void
  addChildToChild: (nodeId: string, targetChildId: string, newChild: ChildNode) => void
}

export function isFrankNode(node: FlowNode): node is FrankNodeType {
  return node.type === 'frankNode'
}

function isExitNode(node: FlowNode): node is ExitNode {
  return node.type === 'exitNode'
}

function isStickyNote(node: FlowNode): node is StickyNote {
  return node.type === 'stickyNote'
}

function nextFreeNumericId(nodes: FlowNode[]): number {
  let max = -1

  const scan = (ns: FlowNode[]) => {
    for (const n of ns) {
      max = Math.max(max, Number(n.id) || 0)
      if (isFrankNode(n) && n.data.children?.length) {
        for (const child of n.data.children) {
          max = Math.max(max, Number(child.id) || 0)
        }
      }
    }
  }

  scan(nodes)
  return max + 1
}

const useFlowStore = create<FlowState>((set, get) => ({
  nodes: initialNodes,
  edges: initialEdges,
  viewport: { x: 0, y: 0, zoom: 1 },
  nodeIdCounter: nextFreeNumericId(initialNodes),
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
      edges: [
        ...get().edges.filter((edge) => edge.id !== oldEdge.id),
        {
          ...newConnection,
          id: oldEdge.id,
          type: 'frankEdge',
        },
      ],
    })
  },
  setNodes: (nodes: FlowNode[]): void => {
    set({ nodes })
  },
  setEdges: (edges: Edge[]) => {
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
  addChild: (nodeId, child) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === nodeId && isFrankNode(node)) {
          return {
            ...node,
            data: {
              ...node.data,
              children: [...node.data.children, child],
            },
          }
        }
        return node
      }),
    })
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
  getNodeName: (nodeId: string) => {
    const node = get().nodes.find((n) => n.id === nodeId)
    if (!node) return null
    if (isFrankNode(node) || isExitNode(node)) return node.data.name ?? null
    return null
  },
  addHandle: (nodeId: string, handle: { type: string; index: number }) => {
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
  updateChild: (rootNodeId: string, updatedChild: ChildNode) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id !== rootNodeId || !isFrankNode(node)) return node

        return {
          ...node,
          data: {
            ...node.data,
            children: updateChildRecursive(node.data.children || [], updatedChild),
          },
        }
      }),
    })
  },
  deleteChild: (rootNodeId: string, childId: string) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id !== rootNodeId || !isFrankNode(node)) return node

        return {
          ...node,
          data: {
            ...node.data,
            children: deleteChildRecursive(node.data.children || [], childId),
          },
        }
      }),
    })
  },
  addChildToChild: (nodeId: string, targetChildId: string, newChild: ChildNode) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id !== nodeId) return node

        if (!isFrankNode(node)) return node

        return {
          ...node,
          data: {
            ...node.data,
            children: addChildRecursive(node.data.children ?? [], targetChildId, newChild),
          },
        }
      }),
    })
  },
}))

export default useFlowStore
