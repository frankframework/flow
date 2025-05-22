import {
  Background,
  BackgroundVariant,
  Controls,
  type Edge,
  type Node,
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

export type FlowNode = FrankNode | ExitNode | StickyNote | GroupNode | Node

const NodeContextMenuContext = createContext<(visible: boolean) => void>(() => {})
export const useNodeContextMenu = () => useContext(NodeContextMenuContext)

const selector = (state: FlowState) => ({
  nodes: state.nodes,
  edges: state.edges,
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

  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onReconnect } = useFlowStore(useShallow(selector))

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
    if (selectedNodes.length < 2) return // Do not group if 1 or no nodes are selected

    const parentIds = [...new Set(selectedNodes.map((node) => node.parentId).filter(Boolean))]

    // Check if all children in each group are selected
    const fullySelectedGroupsIds = parentIds.filter((parentId) => {
      const children = nodes.filter((node) => node.parentId === parentId)
      return children.every((child) => selectedNodes.some((sn) => sn.id === child.id))
    })

    if (fullySelectedGroupsIds.length > 1) {
      let updatedNodes = [...nodes]

      for (const parentId of fullySelectedGroupsIds) {
        const groupChildren = updatedNodes.filter((node) => node.parentId === parentId)
        updatedNodes = degroupNodes(groupChildren, parentId!, updatedNodes)
      }

      // Get newly degrouped nodes (which used to be selected)
      const degroupedSelectedNodes = updatedNodes.filter((node) =>
        selectedNodes.some((selected) => selected.id === node.id),
      )

      // Group them into one new group
      groupNodes(degroupedSelectedNodes, updatedNodes)
      return
    }

    // Degroup if all nodes are already in same group
    const allInSameGroup = selectedNodes.every((node) => node.parentId && node.parentId === selectedNodes[0].parentId)
    if (allInSameGroup) {
      const parentId = selectedNodes[0].parentId!
      const updatedNodes = degroupNodes(selectedNodes, parentId, nodes)
      useFlowStore.getState().setNodes(updatedNodes)
      return
    }

    // Add outsider nodes to existing group or form new group of selected nodes
    const ungroupedNodes = selectedNodes.filter((n) => !n.parentId)
    const parentGroups = new Set(selectedNodes.map((n) => n.parentId).filter(Boolean))

    if (parentGroups.size === 1 && ungroupedNodes.length > 0) {
      const parentId = [...parentGroups][0]!
      const parentChildren = nodes.filter((n) => n.parentId === parentId)
      const allChildrenSelected = parentChildren.every((child) =>
        selectedNodes.some((selected) => selected.id === child.id),
      )

      // If all nodes within a group are selected -> Add the nodes outside of the group to the existing group
      if (allChildrenSelected) {
        const updatedNodes = degroupNodes(selectedNodes, parentId, nodes)
        const updatedSelectedNodes = updatedNodes.filter((node) =>
          selectedNodes.some((selectedNode) => selectedNode.id === node.id),
        )
        groupNodes(updatedSelectedNodes, updatedNodes)
        return
      }

      // If not, it will group the selected nodes as normal, detaching any already grouped nodes from their former group
    }

    groupNodes(selectedNodes, nodes)
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

  return (
    <div style={{ height: '100%' }} onDrop={onDrop} onDragOver={onDragOver} onContextMenu={handleRightMouseButtonClick}>
      <ReactFlow
        fitView
        nodes={nodes}
        edges={edges}
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
