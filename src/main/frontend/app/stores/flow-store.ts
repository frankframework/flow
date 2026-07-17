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
import type { GroupNode } from '~/routes/studio/canvas/nodetypes/group-node'

export type FlowSnapshot = {
  nodes: FlowNode[]
  edges: Edge[]
}

export type FlowState = {
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
  setStickyHeight: (nodeId: string, height: number) => void
  setStickyColor: (nodeId: string, color: string) => void
  setStickyCollapsed: (nodeId: string, collapsed: boolean) => void
  setStickyAttachment: (nodeId: string, attachedToNodeId: string | null) => void
  setNodesWithoutHistory: (nodes: FlowNode[]) => void
  setGroupnodeLabel: (nodeId: string, newLabel: string) => void
  setGroupnodeDescription: (nodeId: string, description: string) => void
  setGroupnodeColor: (nodeId: string, color: string) => void
  setNodeName: (nodeId: string, name: string, options?: { isNewNode?: boolean }) => void
  getNodeName: (nodeId: string) => string | null
  setNodesHiddenForwards: (nodeIds: string[], hiddenForwards: boolean) => void
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

export function isExitNode(node: FlowNode): node is ExitNode {
  return node.type === 'exitNode'
}

export function isStickyNote(node: FlowNode): node is StickyNote {
  return node.type === 'stickyNote'
}

export function isGroupNode(node: FlowNode): node is GroupNode {
  return node.type === 'groupNode'
}

function nextFreeNumericId(nodes: FlowNode[]): number {
  let max = -1

  const scan = (ns: FlowNode[]): void => {
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

function wouldCreateDuplicateForward(edges: Edge[], source: string, target: string, label: string): boolean {
  return edges.some(
    (edge): boolean =>
      edge.source === source &&
      edge.target === target &&
      typeof edge.data === 'object' &&
      edge.data !== null &&
      'label' in edge.data &&
      edge.data.label === label,
  )
}

const useFlowStore = create<FlowState>()(
  subscribeWithSelector(
    (
      set,
      get,
    ): {
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
      setStickyHeight: (nodeId: string, height: number) => void
      setStickyColor: (nodeId: string, color: string) => void
      setStickyCollapsed: (nodeId: string, collapsed: boolean) => void
      setStickyAttachment: (nodeId: string, attachedToNodeId: string | null) => void
      setNodesWithoutHistory: (nodes: FlowNode[]) => void
      setGroupnodeLabel: (nodeId: string, newLabel: string) => void
      setGroupnodeDescription: (nodeId: string, description: string) => void
      setGroupnodeColor: (nodeId: string, color: string) => void
      setNodeName: (nodeId: string, name: string, options?: { isNewNode?: boolean }) => void
      getNodeName: (nodeId: string) => string | null
      setNodesHiddenForwards: (nodeIds: string[], hiddenForwards: boolean) => void
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
    } => ({
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
      resetStore: (): void => {
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
      onNodesChange: (changes): void => {
        const state = get()

        // Drag detection
        const dragStart = changes.some(
          (change): boolean =>
            change.type === 'position' && 'dragging' in change && change.dragging === true && !state.isDragging,
        )

        const dragEnd = changes.some(
          (change): boolean => change.type === 'position' && 'dragging' in change && change.dragging === false,
        )

        // Detect resize start
        const resizeStart = changes.some(
          (change): boolean =>
            change.type === 'dimensions' && 'resizing' in change && change.resizing === true && !state.isResizing,
        )

        const resizeEnd = changes.some(
          (change): boolean => change.type === 'dimensions' && 'resizing' in change && change.resizing === false,
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
          changes
            .filter((nodeChange): boolean => nodeChange.type === 'position')
            .map((nodeChangePosition): string => nodeChangePosition.id),
        )

        set((state): { nodes: FlowNode[]; isDragging: boolean; isResizing: boolean } => {
          const updatedNodes = applyNodeChanges(changes, state.nodes)

          const nodes =
            movedNodeIds.size === 0
              ? updatedNodes
              : updatedNodes.map((node): FlowNode => {
                  if (!isStickyNote(node) || !node.data.attachedToNodeId) return node

                  if (movedNodeIds.has(node.data.attachedToNodeId)) {
                    const parent = updatedNodes.find(
                      (updatedNode): boolean => updatedNode.id === node.data.attachedToNodeId,
                    )
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
                    const parent = updatedNodes.find(
                      (updatedNode): boolean => updatedNode.id === node.data.attachedToNodeId,
                    )
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
      onEdgesChange: (changes): void => {
        const state = get()

        const structuralChange = changes.some((change): boolean => change.type === 'remove')

        if (structuralChange) {
          state.saveToHistory()
        }

        set((state): { edges: Edge[] } => ({
          edges: applyEdgeChanges(changes, state.edges),
        }))
      },
      onConnect: (connection): void => {
        const { nodes, edges } = get()
        const sourceNode = nodes.find((node): boolean => node.id === connection.source)
        const label = getEdgeLabelFromHandle(sourceNode, connection.sourceHandle)

        if (wouldCreateDuplicateForward(edges, connection.source, connection.target, label)) return

        get().saveToHistory()
        set({ edges: addEdge({ ...connection, type: 'frankEdge', data: { label } }, get().edges) })
      },
      onReconnect: (oldEdge, newConnection): void => {
        const { nodes, edges } = get()
        const sourceNode = nodes.find((node): boolean => node.id === newConnection.source)
        const label = getEdgeLabelFromHandle(sourceNode, newConnection.sourceHandle)

        const edgesWithoutOld = edges.filter((edge): boolean => edge.id !== oldEdge.id)
        if (wouldCreateDuplicateForward(edgesWithoutOld, newConnection.source, newConnection.target, label)) return

        get().saveToHistory()
        set({
          edges: [
            ...get().edges.filter((edge): boolean => edge.id !== oldEdge.id),
            { ...newConnection, id: oldEdge.id, type: 'frankEdge', data: { label } },
          ],
        })
      },
      setNodes: (nodes: FlowNode[]): void => {
        get().saveToHistory()
        set({ nodes })
      },
      setEdges: (edges: Edge[]): void => {
        get().saveToHistory()
        set({ edges })
      },
      setViewport: (viewport): void => {
        set({ viewport })
      },
      getNextNodeId: (): string => {
        const current = get().nodeIdCounter
        set({ nodeIdCounter: current + 1 })
        return current.toString()
      },
      addNode: (newNode: FlowNode): void => {
        get().saveToHistory()
        set({
          nodes: [...get().nodes, newNode],
        })
      },
      deleteNode: (nodeId: string): void => {
        set((state): { nodes: FlowNode[]; edges: Edge[] } => ({
          nodes: state.nodes.filter((node): boolean => node.id !== nodeId),
          edges: state.edges.filter((edge): boolean => edge.source !== nodeId && edge.target !== nodeId),
        }))
      },
      deleteEdge: (edgeId: string): void => {
        get().saveToHistory()
        set({
          edges: get().edges.filter((edge): boolean => edge.id !== edgeId),
        })
      },
      setAttributes: (nodeId, attributes, { isNewNode = false } = {}): void => {
        if (!isNewNode) get().saveToHistory()
        set({
          nodes: get().nodes.map((node): FlowNode => {
            if (node.id === nodeId && (isFrankNode(node) || isExitNode(node))) {
              return { ...node, data: { ...node.data, attributes } }
            }
            return node
          }),
        })
      },
      getAttributes: (nodeId: string): Record<string, string> | null => {
        const node = get().nodes.find((node): boolean => node.id === nodeId)
        if (node && (isFrankNode(node) || isExitNode(node))) {
          return node.data.attributes || null
        }
        return null
      },
      addChild: (nodeId, child): void => {
        get().saveToHistory()
        set({
          nodes: get().nodes.map((node): FlowNode => {
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
      setStickyText: (nodeId, text): void => {
        get().saveToHistory()
        set({
          nodes: get().nodes.map((node): FlowNode => {
            if (node.id === nodeId && isStickyNote(node)) {
              return { ...node, data: { ...node.data, content: text } }
            }
            return node
          }),
        })
      },
      setStickyHeight: (nodeId, height): void => {
        set({
          nodes: get().nodes.map((node): FlowNode => {
            if (node.id === nodeId && isStickyNote(node)) {
              return {
                ...node,
                height,
                measured: { ...node.measured, height },
                style: { ...node.style, height },
              }
            }
            return node
          }),
        })
      },
      setStickyColor: (nodeId, color): void => {
        get().saveToHistory()
        set({
          nodes: get().nodes.map((node): FlowNode => {
            if (node.id === nodeId && isStickyNote(node)) {
              return { ...node, data: { ...node.data, color } }
            }
            return node
          }),
        })
      },
      setStickyCollapsed: (nodeId, collapsed): void => {
        get().saveToHistory()
        set({
          nodes: get().nodes.map((node): FlowNode => {
            if (node.id !== nodeId || !isStickyNote(node)) return node
            if (collapsed) {
              const width = node.measured?.width ?? node.width ?? FlowConfig.STICKY_NOTE_DEFAULT_WIDTH
              const height = node.measured?.height ?? node.height ?? FlowConfig.STICKY_NOTE_DEFAULT_HEIGHT
              return {
                ...node,
                width: FlowConfig.STICKY_NOTE_BALLOON_WIDTH,
                height: FlowConfig.STICKY_NOTE_BALLOON_HEIGHT,
                measured: {
                  width: FlowConfig.STICKY_NOTE_BALLOON_WIDTH,
                  height: FlowConfig.STICKY_NOTE_BALLOON_HEIGHT,
                },
                style: {
                  ...node.style,
                  width: FlowConfig.STICKY_NOTE_BALLOON_WIDTH,
                  height: FlowConfig.STICKY_NOTE_BALLOON_HEIGHT,
                },
                data: {
                  ...node.data,
                  collapsed: true,
                  preCollapseWidth: width,
                  preCollapseHeight: height,
                },
              }
            }

            const expandWidth = node.data.preCollapseWidth ?? FlowConfig.STICKY_NOTE_DEFAULT_WIDTH
            const expandHeight = node.data.preCollapseHeight ?? FlowConfig.STICKY_NOTE_DEFAULT_HEIGHT
            return {
              ...node,
              width: expandWidth,
              height: expandHeight,
              measured: { width: expandWidth, height: expandHeight },
              style: {
                ...node.style,
                width: expandWidth,
                height: expandHeight,
              },
              data: {
                ...node.data,
                collapsed: false,
                preCollapseWidth: null,
                preCollapseHeight: null,
              },
            }
          }),
        })
      },
      setStickyAttachment: (nodeId, attachedToNodeId): void => {
        get().saveToHistory()
        const nodes = get().nodes
        const sticky = nodes.find((node): boolean => node.id === nodeId)
        if (!sticky || !isStickyNote(sticky)) return

        if (attachedToNodeId) {
          const parent = nodes.find((node): boolean => node.id === attachedToNodeId)
          if (!parent) return
          const offsetX = sticky.position.x - parent.position.x
          const offsetY = sticky.position.y - parent.position.y
          set({
            nodes: nodes.map((node): FlowNode =>
              node.id === nodeId && isStickyNote(node)
                ? { ...node, data: { ...node.data, attachedToNodeId, offsetX, offsetY } }
                : node,
            ),
          })
        } else {
          set({
            nodes: nodes.map((node): FlowNode =>
              node.id === nodeId && isStickyNote(node)
                ? { ...node, data: { ...node.data, attachedToNodeId: null, offsetX: null, offsetY: null } }
                : node,
            ),
          })
        }
      },
      setNodesWithoutHistory: (nodes): void => set({ nodes }),
      setGroupnodeLabel: (nodeId, newLabel): void => {
        get().saveToHistory()
        set({
          nodes: get().nodes.map((node): FlowNode => {
            if (node.id === nodeId && isGroupNode(node)) {
              return { ...node, data: { ...node.data, label: newLabel } }
            }
            return node
          }),
        })
      },
      setGroupnodeDescription: (nodeId, description): void => {
        get().saveToHistory()
        set({
          nodes: get().nodes.map((node): FlowNode => {
            if (node.id === nodeId && isGroupNode(node)) {
              return { ...node, data: { ...node.data, description } }
            }
            return node
          }),
        })
      },
      setGroupnodeColor: (nodeId, color): void => {
        get().saveToHistory()
        set({
          nodes: get().nodes.map((node): FlowNode => {
            if (node.id === nodeId && isGroupNode(node)) {
              return { ...node, data: { ...node.data, color } }
            }
            return node
          }),
        })
      },
      setNodeName: (nodeId, name, { isNewNode = false } = {}): void => {
        if (!isNewNode) get().saveToHistory()

        const taken = new Set<string>(
          get()
            .nodes.filter((n): boolean => n.id !== nodeId && (isFrankNode(n) || isExitNode(n)))
            .map((n): string => (n as FrankNodeType | ExitNode).data.name),
        )

        let uniqueName = name
        for (let counter = 2; taken.has(uniqueName); counter++) {
          uniqueName = `${name}_${counter}`
        }

        set((state): { nodes: FlowNode[] } => ({
          nodes: state.nodes.map((n): FlowNode => {
            if (n.id !== nodeId || (!isFrankNode(n) && !isExitNode(n))) return n
            return { ...n, data: { ...n.data, name: uniqueName } }
          }),
        }))
      },
      getNodeName: (nodeId: string): string | null => {
        const node = get().nodes.find((n): boolean => n.id === nodeId)
        if (!node) return null
        if (isFrankNode(node) || isExitNode(node)) return node.data.name ?? null
        return null
      },
      setNodesHiddenForwards: (nodeIds: string[], hiddenForwards: boolean): void => {
        get().saveToHistory()
        const ids = new Set(nodeIds)
        set({
          nodes: get().nodes.map((node): FlowNode =>
            ids.has(node.id) && (isFrankNode(node) || isExitNode(node))
              ? { ...node, data: { ...node.data, hiddenForwards } }
              : node,
          ),
        })
      },
      addHandle: (nodeId: string, handle: { type: string; index: number }): void => {
        get().saveToHistory()
        set({
          nodes: get().nodes.map((node): FlowNode => {
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
      updateHandle: (nodeId: string, handleIndex: number, newHandle: { type: string; index: number }): void => {
        const state = get()
        state.saveToHistory()

        const updatedNodes = state.nodes.map((node): FlowNode => {
          if (node.id === nodeId && isFrankNode(node)) {
            const updatedHandles = node.data.sourceHandles.map((handle): { type: string; index: number } =>
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
        const updatedEdges = state.edges.map((edge): Edge => {
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
      updateChild: (rootNodeId: string, updatedChild: ChildNode, { isNewNode = false } = {}): void => {
        if (!isNewNode) get().saveToHistory()
        set({
          nodes: get().nodes.map((node): FlowNode => {
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
      deleteChild: (rootNodeId: string, childId: string): void => {
        get().saveToHistory()
        set({
          nodes: get().nodes.map((node): FlowNode => {
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
      addChildToChild: (nodeId: string, targetChildId: string, newChild: ChildNode): void => {
        get().saveToHistory()
        set({
          nodes: get().nodes.map((node): FlowNode => {
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
      setHistory: (history: FlowSnapshot[]): void => set({ history }),
      setFuture: (future: FlowSnapshot[]): void => set({ future }),
      saveToHistory: (): void => {
        const snapshot = createSnapshot(get())

        set((state): { history: FlowSnapshot[]; future: never[] } => ({
          history: [...state.history, snapshot].slice(-FlowConfig.MAX_HISTORY),
          future: [],
        }))
      },
      undo: (): void => {
        const { history } = get()
        if (history.length === 0) return

        const previous = history.at(-1)! // Already checked that history is not empty, so this is safe
        const currentSnapshot = createSnapshot(get())

        set((state): { nodes: FlowNode[]; edges: Edge[]; history: FlowSnapshot[]; future: FlowSnapshot[] } => ({
          nodes: previous.nodes,
          edges: previous.edges,
          history: state.history.slice(0, -1),
          future: [currentSnapshot, ...state.future],
        }))
      },

      redo: (): void => {
        const { future } = get()
        if (future.length === 0) return

        const next = future[0]
        const currentSnapshot = createSnapshot(get())

        set((state): { nodes: FlowNode[]; edges: Edge[]; history: FlowSnapshot[]; future: FlowSnapshot[] } => ({
          nodes: next.nodes,
          edges: next.edges,
          history: [...state.history, currentSnapshot],
          future: state.future.slice(1),
        }))
      },
    }),
  ),
)

export default useFlowStore
