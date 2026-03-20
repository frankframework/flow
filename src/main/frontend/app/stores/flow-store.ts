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
import { FlowConfig } from '~/routes/studio/canvas/flow.config'
import { subscribeWithSelector } from 'zustand/middleware'
import { getEdgeLabelFromHandle } from '~/utils/flow-utils'

export interface FlowSnapshot {
  nodes: FlowNode[]
  edges: Edge[]
}

export interface FlowState {
  nodes: FlowNode[]
  edges: Edge[]
  viewport: { x: number; y: number; zoom: number }
  nodeIdCounter: number
  isDragging: boolean
  isResizing: boolean
  isPerformingAction: boolean
  isInternalChange: boolean
  history: FlowSnapshot[]
  future: FlowSnapshot[]
  resetStore: () => void
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
  setAttributes: (nodeId: string, attributes: Record<string, string>, options?: { isNewNode?: boolean }) => void
  getAttributes: (nodeId: string) => Record<string, string> | null
  addChild: (nodeId: string, child: ChildNode) => void
  setStickyText: (nodeId: string, text: string) => void
  setNodeName: (nodeId: string, name: string, options?: { isNewNode?: boolean }) => void
  getNodeName: (nodeId: string) => string | null
  addHandle: (nodeId: string, handle: { type: string; index: number }) => void
  updateHandle: (nodeId: string, handleIndex: number, newHandle: { type: string; index: number }) => void
  updateChild: (parentNodeId: string, updatedChild: ChildNode, options?: { isNewNode?: boolean }) => void
  deleteChild: (parentId: string, childId: string) => void
  addChildToChild: (nodeId: string, targetChildId: string, newChild: ChildNode) => void
  setHistory: (history: FlowSnapshot[]) => void
  setFuture: (future: FlowSnapshot[]) => void
  saveToHistory: () => void
  undo: () => void
  redo: () => void
}

export function isFrankNode(node: FlowNode): node is FrankNodeType {
  return node.type === 'frankNode'
}

function isExitNode(node: FlowNode): node is ExitNode {
  return node.type === 'exitNode'
}

export function isStickyNote(node: FlowNode): node is StickyNote {
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

const createSnapshot = (state: FlowState): FlowSnapshot => ({
  nodes: structuredClone(state.nodes),
  edges: structuredClone(state.edges),
})

const useFlowStore = create<FlowState>()(
  subscribeWithSelector((set, get) => ({
    nodes: initialNodes,
    edges: initialEdges,
    viewport: { x: 0, y: 0, zoom: 1 },
    nodeIdCounter: nextFreeNumericId(initialNodes),
    isDragging: false,
    isResizing: false,
    isPerformingAction: false,
    isInternalChange: false,
    history: [],
    future: [],
    resetStore: () => {
      set({
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
        nodeIdCounter: nextFreeNumericId(initialNodes),
        isDragging: false,
        isInternalChange: false,
        history: [],
        future: [],
      })
    },
    onNodesChange: (changes) => {
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
        (change) =>
          change.type === 'dimensions' && 'resizing' in change && change.resizing === true && !state.isResizing,
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

      set((state) => ({
        nodes: applyNodeChanges(changes, state.nodes),
        isDragging: nextIsDragging,
        isResizing: nextIsResizing,
      }))
    },
    onEdgesChange: (changes) => {
      const state = get()

      const structuralChange = changes.some((change) => change.type === 'remove')

      if (structuralChange) {
        state.saveToHistory()
      }

      set((state) => ({
        edges: applyEdgeChanges(changes, state.edges),
      }))
    },
    onConnect: (connection) => {
      get().saveToHistory()

      const { nodes } = get()
      const sourceNode = nodes.find((node) => node.id === connection.source)

      const label = getEdgeLabelFromHandle(sourceNode, connection.sourceHandle)

      const newEdge = {
        ...connection,
        type: 'frankEdge',
        data: { label },
      }

      set({
        edges: addEdge(newEdge, get().edges),
      })
    },
    onReconnect: (oldEdge, newConnection) => {
      get().saveToHistory()

      const { nodes } = get()
      const sourceNode = nodes.find((node) => node.id === newConnection.source)

      const label = getEdgeLabelFromHandle(sourceNode, newConnection.sourceHandle)

      set({
        edges: [
          ...get().edges.filter((edge) => edge.id !== oldEdge.id),
          {
            ...newConnection,
            id: oldEdge.id,
            type: 'frankEdge',
            data: { label },
          },
        ],
      })
    },
    setNodes: (nodes: FlowNode[]): void => {
      get().saveToHistory()
      set({ nodes })
    },
    setEdges: (edges: Edge[]) => {
      get().saveToHistory()
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
      get().saveToHistory()
      set({
        nodes: [...get().nodes, newNode],
      })
    },
    deleteNode: (nodeId: string) => {
      set((state) => ({
        nodes: state.nodes.filter((node) => node.id !== nodeId),
        edges: state.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
      }))
    },
    deleteEdge: (edgeId: string) => {
      get().saveToHistory()
      set({
        edges: get().edges.filter((edge) => edge.id !== edgeId),
      })
    },
    setAttributes: (nodeId, attributes, { isNewNode = false } = {}) => {
      if (!isNewNode) get().saveToHistory()
      set({
        nodes: get().nodes.map((node) => {
          if (node.id === nodeId && (isFrankNode(node) || isExitNode(node))) {
            return { ...node, data: { ...node.data, attributes } }
          }
          return node
        }),
      })
    },
    getAttributes: (nodeId: string) => {
      const node = get().nodes.find((node) => node.id === nodeId)
      if (node && (isFrankNode(node) || isExitNode(node))) {
        return node.data.attributes || null
      }
      return null
    },
    addChild: (nodeId, child) => {
      get().saveToHistory()
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
      get().saveToHistory()
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
    setNodeName: (nodeId, name, { isNewNode = false } = {}) => {
      if (!isNewNode) get().saveToHistory()
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
      get().saveToHistory()
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
      const state = get()
      state.saveToHistory()

      const updatedNodes = state.nodes.map((node) => {
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
      })

      // Update label data of associated edge
      const updatedEdges = state.edges.map((edge) => {
        if (edge.source === nodeId && Number(edge.sourceHandle) === handleIndex) {
          return {
            ...edge,
            data: {
              ...edge.data,
              label: newHandle.type.toLowerCase(),
            },
          }
        }
        return edge
      })

      set({
        nodes: updatedNodes,
        edges: updatedEdges,
      })
    },
    updateChild: (rootNodeId: string, updatedChild: ChildNode, { isNewNode = false } = {}) => {
      if (!isNewNode) get().saveToHistory()
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
      get().saveToHistory()
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
      get().saveToHistory()
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
    setHistory: (history: FlowSnapshot[]) => set({ history }),
    setFuture: (future: FlowSnapshot[]) => set({ future }),
    saveToHistory: () => {
      const snapshot = createSnapshot(get())

      set((state) => ({
        history: [...state.history, snapshot].slice(-FlowConfig.MAX_HISTORY),
        future: [],
      }))
    },
    undo: () => {
      const { history } = get()
      if (history.length === 0) return

      const previous = history.at(-1)! // Already checked that history is not empty, so this is safe
      const currentSnapshot = createSnapshot(get())

      set((state) => ({
        nodes: previous.nodes,
        edges: previous.edges,
        history: state.history.slice(0, -1),
        future: [currentSnapshot, ...state.future],
      }))
    },

    redo: () => {
      const { future } = get()
      if (future.length === 0) return

      const next = future[0]
      const currentSnapshot = createSnapshot(get())

      set((state) => ({
        nodes: next.nodes,
        edges: next.edges,
        history: [...state.history, currentSnapshot],
        future: state.future.slice(1),
      }))
    },
  })),
)

export default useFlowStore
