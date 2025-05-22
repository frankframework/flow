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
import StartNodeComponent, { type StartNode } from '~/routes/builder/canvas/nodetypes/start-node'
import useFlowStore, { type FlowState } from '~/stores/flow-store'
import { useShallow } from 'zustand/react/shallow'
import { FlowConfig } from '~/routes/builder/canvas/flow.config'
import { getElementTypeFromName } from '~/routes/builder/node-translator-module'
import { createContext, useContext, useEffect } from 'react'
import StickyNoteComponent, { type StickyNote } from '~/routes/builder/canvas/nodetypes/sticky-note'
import useTabStore from '~/stores/tab-store'

export type FlowNode = FrankNode | StartNode | ExitNode | StickyNote | Node

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
    startNode: StartNodeComponent,
    stickyNote: StickyNoteComponent,
  }
  const edgeTypes = { frankEdge: FrankEdgeComponent }
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
