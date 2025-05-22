import {
  Background,
  BackgroundVariant,
  Controls,
  type Edge,
  type Node,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react'
import Dagre from '@dagrejs/dagre'
import '@xyflow/react/dist/style.css'
import FrankNodeComponent, { type FrankNode } from '~/routes/builder/canvas/nodetypes/frank-node'
import FrankEdgeComponent from '~/routes/builder/canvas/edgetypes/frank-edge'
import ExitNodeComponent, { type ExitNode } from '~/routes/builder/canvas/nodetypes/exit-node'
import GroupNodeComponent, { type GroupNode } from '~/routes/builder/canvas/nodetypes/group-node'
import useFlowStore, { type FlowState } from '~/stores/flow-store'
import { useShallow } from 'zustand/react/shallow'
import { FlowConfig } from '~/routes/builder/canvas/flow.config'
import { getElementTypeFromName } from '~/routes/builder/node-translator-module'
import { createContext, useContext, useEffect } from 'react'
import StickyNoteComponent, { type StickyNote } from '~/routes/builder/canvas/nodetypes/sticky-note'
import useTabStore from '~/stores/tab-store'

export type FlowNode = FrankNode | ExitNode | StickyNote | GroupNode | Node

const NodeContextMenuContext = createContext<(visible: boolean) => void>(() => {})
export const useNodeContextMenu = () => useContext(NodeContextMenuContext)

const selector = (state: FlowState) => ({
  nodes: state.nodes,
  edges: state.edges,
  viewport: state.viewport,
  onNodesChange: state.onNodesChange,
  onEdgesChange: state.onEdgesChange,
  onConnect: state.onConnect,
  onReconnect: state.onReconnect,
})

function FlowCanvas({ showNodeContextMenu }: Readonly<{ showNodeContextMenu: (b: boolean) => void }>) {
  const nodeTypes = {
    frankNode: FrankNodeComponent,
    exitNode: ExitNodeComponent,
    stickyNote: StickyNoteComponent,
    groupNode: GroupNodeComponent,
  }
  const edgeTypes = { frankEdge: FrankEdgeComponent }
  const defaultEdgeOptions = { zIndex: 1001 } // Greater index than 1000, the default for a node when it is selected. Enables clicking on edges always
  const reactFlow = useReactFlow()

  const { nodes, edges, viewport, onNodesChange, onEdgesChange, onConnect, onReconnect } = useFlowStore(
    useShallow(selector),
  )

  useEffect(() => {
    const laidOutNodes = layoutGraph(nodes, edges, 'LR')
    useFlowStore.getState().setNodes(laidOutNodes)
  }, [])

  const layoutGraph = (nodes: Node[], edges: Edge[], direction: 'TB' | 'LR' = 'LR'): Node[] => {
    const dagreGraph = new Dagre.graphlib.Graph()
    dagreGraph.setDefaultEdgeLabel(() => ({}))
    dagreGraph.setGraph({ rankdir: direction })

    for (const node of nodes) {
      dagreGraph.setNode(node.id, {
        width: FlowConfig.NODE_DEFAULT_WIDTH * 1.5,
        height: FlowConfig.NODE_DEFAULT_HEIGHT * 1.5,
      })
    }

    for (const edge of edges) {
      dagreGraph.setEdge(edge.source, edge.target)
    }

    Dagre.layout(dagreGraph)

    return nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id)
      return {
        ...node,
        position: {
          x: nodeWithPosition.x,
          y: nodeWithPosition.y,
        },
      }
    })
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const tagName = (event.target as HTMLElement).tagName
      const isTyping = ['INPUT', 'TEXTAREA'].includes(tagName) || (event.target as HTMLElement).isContentEditable
      if (isTyping) return

      if (event.key === 'g' || event.key === 'G') {
        event.preventDefault()
        handleGrouping()
      }
    }

    globalThis.addEventListener('keydown', handleKeyDown)
    return () => globalThis.removeEventListener('keydown', handleKeyDown)
  }, [nodes])

  const handleGrouping = () => {
    const selectedNodes = nodes.filter((node) => node.selected)
    if (selectedNodes.length < 2) return

    const parentIds = [...new Set(selectedNodes.map((node) => node.parentId).filter(Boolean))]
    const fullySelectedGroupIds = getFullySelectedGroupIds(parentIds, selectedNodes)

    if (fullySelectedGroupIds.length > 1) {
      handleMultiGroupMerge(fullySelectedGroupIds, selectedNodes)
      return
    }

    if (allSelectedInSameGroup(selectedNodes)) {
      handleDegroupSingleGroup(selectedNodes)
      return
    }

    if (shouldMergeUngroupedIntoGroup(selectedNodes)) {
      handleMergeUngroupedIntoGroup(selectedNodes)
      return
    }

    groupNodes(selectedNodes, nodes)
  }

  // Helpers

  const getFullySelectedGroupIds = (parentIds: string[], selectedNodes: FlowNode[]) => {
    return parentIds.filter((parentId) => {
      const children = nodes.filter((node) => node.parentId === parentId)
      return children.every((child) => selectedNodes.some((sn) => sn.id === child.id))
    })
  }

  const handleMultiGroupMerge = (groupIds: string[], selectedNodes: FlowNode[]) => {
    let updatedNodes = [...nodes]
    for (const parentId of groupIds) {
      const groupChildren = updatedNodes.filter((node) => node.parentId === parentId)
      updatedNodes = degroupNodes(groupChildren, parentId!, updatedNodes)
    }

    const degroupedSelectedNodes = updatedNodes.filter((node) =>
      selectedNodes.some((selected) => selected.id === node.id),
    )

    groupNodes(degroupedSelectedNodes, updatedNodes)
  }

  const allSelectedInSameGroup = (selectedNodes: FlowNode[]) => {
    return selectedNodes.every((node) => node.parentId && node.parentId === selectedNodes[0].parentId)
  }

  const handleDegroupSingleGroup = (selectedNodes: FlowNode[]) => {
    const parentId = selectedNodes[0].parentId!
    const updatedNodes = degroupNodes(selectedNodes, parentId, nodes)
    useFlowStore.getState().setNodes(updatedNodes)
  }

  const shouldMergeUngroupedIntoGroup = (selectedNodes: FlowNode[]) => {
    const ungroupedNodes = selectedNodes.filter((n) => !n.parentId)
    const parentGroups = new Set(selectedNodes.map((n) => n.parentId).filter(Boolean))
    if (parentGroups.size === 1 && ungroupedNodes.length > 0) {
      const parentId = [...parentGroups][0]!
      const parentChildren = nodes.filter((n) => n.parentId === parentId)
      return parentChildren.every((child) => selectedNodes.some((s) => s.id === child.id))
    }
    return false
  }

  const handleMergeUngroupedIntoGroup = (selectedNodes: FlowNode[]) => {
    const parentId = selectedNodes.find((n) => n.parentId)?.parentId
    const updatedNodes = degroupNodes(selectedNodes, parentId, nodes)
    const updatedSelectedNodes = updatedNodes.filter((node) =>
      selectedNodes.some((selectedNode) => selectedNode.id === node.id),
    )
    groupNodes(updatedSelectedNodes, updatedNodes)
  }

  const degroupNodes = (selectedNodes: FlowNode[], parentId: string, allNodes: FlowNode[]): FlowNode[] => {
    const groupNode = allNodes.find((node) => node.id === parentId)
    if (!groupNode) return allNodes

    const groupX = groupNode.position.x
    const groupY = groupNode.position.y

    const updatedNodes = allNodes
      .map((node) => {
        if (node.id === parentId) {
          return null // remove group node
        }

        if (selectedNodes.includes(node) && node.parentId === parentId) {
          return {
            ...node,
            parentId: undefined,
            extent: undefined,
            position: {
              x: node.position.x + groupX,
              y: node.position.y + groupY,
            },
          }
        }

        return node
      })
      .filter((node): node is FlowNode => node !== null)

    return updatedNodes
  }

  const groupNodes = (nodesToGroup: FlowNode[], currentNodes: FlowNode[]) => {
    const minX = Math.min(...nodesToGroup.map((node) => node.position.x))
    const minY = Math.min(...nodesToGroup.map((node) => node.position.y))
    const maxX = Math.max(...nodesToGroup.map((node) => node.position.x + (node.measured?.width ?? 0)))
    const maxY = Math.max(...nodesToGroup.map((node) => node.position.y + (node.measured?.height ?? 0)))

    const padding = 30
    const width = maxX - minX + padding * 2
    const height = maxY - minY + padding * 2

    const newGroupId = useFlowStore.getState().getNextNodeId()

    const groupNode: FlowNode = {
      id: newGroupId,
      position: { x: minX - padding, y: minY - padding },
      type: 'groupNode',
      data: { label: 'New Group', width: width, height: height },
      dragHandle: '.drag-handle',
      selectable: false,
    }

    const updatedSelectedNodes: FlowNode[] = nodesToGroup.map((node) => ({
      ...node,
      position: {
        x: node.position.x - minX + padding,
        y: node.position.y - minY + padding,
      },
      parentId: newGroupId,
      extent: 'parent',
      selected: false,
    }))

    const allNodes = [...currentNodes.filter((node) => !node.selected), groupNode, ...updatedSelectedNodes]

    useFlowStore.getState().setNodes(allNodes)
  }

  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault()
    showNodeContextMenu(true)

    const data = event.dataTransfer.getData('application/reactflow')
    if (!data) return

    const parsedData = JSON.parse(data)
    const { screenToFlowPosition } = reactFlow

    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })
    const newId = useFlowStore.getState().getNextNodeId()
    const elementType = getElementTypeFromName(parsedData.name)
    const nodeType = elementType == 'exit' ? 'exitNode' : 'frankNode'
    const newNode: FrankNode = {
      id: newId.toString(),
      position: {
        x: position.x - (nodeType == 'exitNode' ? FlowConfig.EXIT_DEFAULT_WIDTH : FlowConfig.NODE_DEFAULT_WIDTH) / 2, // Centers node on top of cursor
        y: position.y - (nodeType == 'exitNode' ? FlowConfig.EXIT_DEFAULT_HEIGHT : FlowConfig.NODE_DEFAULT_HEIGHT) / 2,
      },
      data: {
        subtype: parsedData.name,
        type: elementType,
        name: ``,
        sourceHandles: [{ type: 'success', index: 1 }],
        children: [],
      },
      type: nodeType,
    }
    useFlowStore.getState().addNode(newNode)
  }

  const handleRightMouseButtonClick = (event) => {
    event.preventDefault()
    const { screenToFlowPosition } = reactFlow
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })
    const newId = useFlowStore.getState().getNextNodeId()

    const stickyNote: StickyNote = {
      id: newId,
      position: {
        x: position.x - FlowConfig.STICKY_NOTE_DEFAULT_WIDTH / 2,
        y: position.y - FlowConfig.STICKY_NOTE_DEFAULT_HEIGHT / 2,
      },
      data: {
        content: 'New Sticky Note',
      },
      type: 'stickyNote',
    }
    useFlowStore.getState().addNode(stickyNote)
  }

  useEffect(() => {
    const unsubscribe = useTabStore.subscribe(
      (state) => state.activeTab,
      (newTab, oldTab) => {
        if (oldTab) saveFlowToTab(oldTab)
        restoreFlowFromTab(newTab)
      },
    )
    return () => unsubscribe()
  }, [])

  const saveFlowToTab = (tabId: string) => {
    const tabStore = useTabStore.getState()
    const flowStore = useFlowStore.getState()

    const flowData = reactFlow.toObject()
    const viewport = flowStore.viewport

    tabStore.setTabData(tabId, {
      value: tabId,
      flowJson: {
        ...flowData,
        viewport,
      },
    })
  }

  const restoreFlowFromTab = (tabId: string) => {
    const tabStore = useTabStore.getState()
    const flowStore = useFlowStore.getState()

    const tabData = tabStore.getTab(tabId)
    const flowJson = tabData?.flowJson

    if (flowJson) {
      flowStore.setNodes(flowJson.nodes || [])
      flowStore.setEdges(flowJson.edges || [])
      flowStore.setViewport(flowJson.viewport || { x: 0, y: 0, zoom: 1 })
    } else {
      flowStore.setNodes([])
      flowStore.setEdges([])
      flowStore.setViewport({ x: 0, y: 0, zoom: 1 })
    }
  }

  return (
    <div style={{ height: '100%' }} onDrop={onDrop} onDragOver={onDragOver} onContextMenu={handleRightMouseButtonClick}>
      <ReactFlow
        fitView
        nodes={nodes}
        edges={edges}
        viewport={viewport}
        onMove={(event, viewport) => {
          useFlowStore.getState().setViewport(viewport)
        }}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onReconnect={onReconnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        deleteKeyCode={'Delete'}
      >
        <Controls position="top-left"></Controls>
        <Background variant={BackgroundVariant.Dots} size={2}></Background>
        <Panel position="top-right" className="bg-gray-200 p-4"></Panel>
      </ReactFlow>
    </div>
  )
}

export default function Flow({ showNodeContextMenu }: Readonly<{ showNodeContextMenu: (b: boolean) => void }>) {
  return (
    <NodeContextMenuContext.Provider value={showNodeContextMenu}>
      <ReactFlowProvider>
        <FlowCanvas showNodeContextMenu={showNodeContextMenu} />
      </ReactFlowProvider>
    </NodeContextMenuContext.Provider>
  )
}
