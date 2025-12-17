import {
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  type Edge,
  type Node,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  Panel,
} from '@xyflow/react'
import Dagre from '@dagrejs/dagre'
import '@xyflow/react/dist/style.css'
import FrankNodeComponent, { type FrankNodeType } from '~/routes/studio/canvas/nodetypes/frank-node'
import FrankEdgeComponent from '~/routes/studio/canvas/edgetypes/frank-edge'
import ExitNodeComponent, { type ExitNode } from '~/routes/studio/canvas/nodetypes/exit-node'
import GroupNodeComponent, { type GroupNode } from '~/routes/studio/canvas/nodetypes/group-node'
import useFlowStore, { type FlowState } from '~/stores/flow-store'
import { useShallow } from 'zustand/react/shallow'
import { FlowConfig } from '~/routes/studio/canvas/flow.config'
import { getElementTypeFromName } from '~/routes/studio/node-translator-module'
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import StickyNoteComponent, { type StickyNote } from '~/routes/studio/canvas/nodetypes/sticky-note'
import useTabStore from '~/stores/tab-store'
import { convertAdapterXmlToJson, getAdapterFromConfiguration } from '~/routes/studio/xml-to-json-parser'
import { exportFlowToXml } from '~/routes/studio/flow-to-xml-parser'
import useNodeContextStore from '~/stores/node-context-store'
import CreateNodeModal from '~/components/flow/create-node-modal'
import { useProjectStore } from '~/stores/project-store'
import { toast, ToastContainer } from 'react-toastify'
import { useTheme } from '~/hooks/use-theme'

export type FlowNode = FrankNodeType | ExitNode | StickyNote | GroupNode | Node

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
  const theme = useTheme()
  const [loading, setLoading] = useState(false)
  const { isEditing, setIsEditing, setParentId } = useNodeContextStore(
    useShallow((s) => ({
      isEditing: s.isEditing,
      setIsEditing: s.setIsEditing,
      setParentId: s.setParentId,
    })),
  )
  const [showModal, setShowModal] = useState(false)
  const [edgeDropPositions, setEdgeDropPositions] = useState<{ x: number; y: number } | null>(null)

  const nodeTypes = {
    frankNode: FrankNodeComponent,
    exitNode: ExitNodeComponent,
    stickyNote: StickyNoteComponent,
    groupNode: GroupNodeComponent,
  }
  const edgeTypes = { frankEdge: FrankEdgeComponent }
  const reactFlow = useReactFlow()

  const { nodes, edges, viewport, onNodesChange, onEdgesChange, onConnect, onReconnect } = useFlowStore(
    useShallow(selector),
  )
  const project = useProjectStore.getState().project

  const sourceInfoReference = useRef<{
    nodeId: string | null
    handleId: string | null
    handleType: 'source' | 'target' | null
  }>({ nodeId: null, handleId: null, handleType: null })

  const handleConnectStart = (_: any, { nodeId, handleId, handleType }) => {
    sourceInfoReference.current = { nodeId, handleId, handleType }
  }

  const handleConnectEnd = (event: MouseEvent, connectionState) => {
    if (!connectionState.isValid) {
      let x: number, y: number
      x = event.clientX
      y = event.clientY
      handleEdgeDropOnCanvas(x, y)
    }
  }

  const handleEdgeDropOnCanvas = (x: number, y: number) => {
    const { screenToFlowPosition } = reactFlow
    const flowPositions = screenToFlowPosition({ x: x, y: y })

    setEdgeDropPositions(flowPositions)
    setShowModal(true)
  }

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
    setParentId(null)

    const data = event.dataTransfer.getData('application/reactflow')
    if (!data) return

    const parsedData = JSON.parse(data)
    const { screenToFlowPosition } = reactFlow

    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })
    addNodeAtPosition(position, parsedData.name)
  }

  function addNodeAtPosition(
    position: { x: number; y: number },
    elementName: string,
    sourceInfo?: { nodeId: string | null; handleId: string | null; handleType: 'source' | 'target' | null },
  ) {
    showNodeContextMenu(true)
    setIsEditing(true)

    const flowStore = useFlowStore.getState()
    const newId = flowStore.getNextNodeId()

    const elementType = getElementTypeFromName(elementName)
    const nodeType = elementType === 'exit' ? 'exitNode' : 'frankNode'

    const width = nodeType === 'exitNode' ? FlowConfig.EXIT_DEFAULT_WIDTH : FlowConfig.NODE_DEFAULT_WIDTH
    const height = nodeType === 'exitNode' ? FlowConfig.EXIT_DEFAULT_HEIGHT : FlowConfig.NODE_DEFAULT_HEIGHT

    const newNode: FrankNodeType = {
      id: newId.toString(),
      position: {
        x: position.x - width / 2, // Center on cursor
        y: position.y - height / 2,
      },
      data: {
        subtype: elementName,
        type: elementType,
        name: ``,
        sourceHandles: [{ type: 'success', index: 1 }],
        children: [],
      },
      type: nodeType,
    }

    flowStore.addNode(newNode)
    // If there’s a source node, create an edge from it
    if (sourceInfo?.nodeId && sourceInfo.handleType === 'source') {
      const newEdge: Edge = {
        id: `e${sourceInfo.nodeId}-${newId}`,
        source: sourceInfo.nodeId,
        sourceHandle: sourceInfo.handleId ?? undefined,
        target: newId.toString(),
        type: 'frankEdge',
        data: {},
      }

      flowStore.setEdges(addEdge(newEdge, flowStore.edges))
      sourceInfoReference.current = { nodeId: null, handleId: null, handleType: null }
    }
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
    const tabStore = useTabStore.getState()
    const currentActiveTabKey = tabStore.activeTab

    // Handle the case where the tab was already set before mount
    if (currentActiveTabKey) {
      const activeTab = tabStore.getTab(currentActiveTabKey)
      if (activeTab) {
        loadFlowFromTab(activeTab)
      }
    }

    // Subscribe to future tab changes
    const unsubscribe = useTabStore.subscribe(
      (state) => state.activeTab,
      async (newTab, oldTab) => {
        if (!newTab) {
          clearFlow()
          return
        }

        if (oldTab) saveFlowToTab(oldTab)

        const activeTab = useTabStore.getState().getTab(newTab)
        if (!activeTab) return

        await loadFlowFromTab(activeTab)
      },
    )

    return () => unsubscribe()
  }, [])

  function clearFlow() {
    const flowStore = useFlowStore.getState()
    flowStore.setNodes([])
    flowStore.setEdges([])
    flowStore.setViewport({ x: 0, y: 0, zoom: 1 })
  }

  async function loadFlowFromTab(tab) {
    const flowStore = useFlowStore.getState()
    setLoading(true)
    try {
      if (tab.flowJson && Object.keys(tab.flowJson).length > 0) {
        restoreFlowFromTab(tab.value)
      } else if (tab.configurationName && tab.value) {
        if (!project) return
        const adapter = await getAdapterFromConfiguration(project.name, tab.configurationName, tab.value)
        if (!adapter) return
        const adapterJson = await convertAdapterXmlToJson(adapter)
        flowStore.setEdges(adapterJson.edges)
        flowStore.setViewport({ x: 0, y: 0, zoom: 1 })
        const laidOutNodes = layoutGraph(adapterJson.nodes, adapterJson.edges, 'LR')
        flowStore.setNodes(laidOutNodes)
      }
    } catch (error) {
      console.error('Error loading tab flow:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveFlowToTab = (tabId: string) => {
    const tabStore = useTabStore.getState()
    const flowStore = useFlowStore.getState()

    const flowData = reactFlow.toObject()
    const viewport = flowStore.viewport
    const tabData = tabStore.getTab(tabId)

    if (!tabData) return

    tabStore.setTabData(tabId, {
      ...tabData,
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

  const exportToXml = () => {
    const flowData = reactFlow.toObject()
    const activeTabName = useTabStore.getState().activeTab
    const xmlString = exportFlowToXml(flowData, activeTabName)
    const fileName = 'FlowConfiguration.xml'
    const blob = new Blob([xmlString], { type: 'application/xml' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.click()

    URL.revokeObjectURL(url)
  }

  const saveFlow = async () => {
    const flowData = reactFlow.toObject()
    const activeTabName = useTabStore.getState().activeTab
    const configName = useTabStore.getState().getTab(activeTabName)?.configurationName
    if (!configName) return

    const xmlString = exportFlowToXml(flowData, activeTabName)

    try {
      if (!project) return
      const url = `/api/projects/${encodeURIComponent(project.name)}/${encodeURIComponent(configName)}/adapters/${encodeURIComponent(activeTabName)}`
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adapterXml: xmlString }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      toast.success('Flow saved successfully!')
    } catch (error) {
      console.error('Failed to save XML:', error)
      toast.error(`Failed to save XML: ${error}`)
    }
  }

  return (
    <div
      className="relative h-full w-full"
      onDrop={onDrop}
      onDragOver={onDragOver}
      onContextMenu={handleRightMouseButtonClick}
    >
      {loading && (
        <div className="bg-opacity-80 bg-background absolute inset-0 z-50 flex items-center justify-center">
          <div className="border-border h-10 w-10 animate-spin rounded-full border-t-2 border-b-2"></div>
        </div>
      )}
      {!isEditing || <div className="absolute inset-0 z-50 cursor-not-allowed bg-black/20" />}

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
        onConnectStart={handleConnectStart}
        onConnectEnd={handleConnectEnd}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        deleteKeyCode={'Delete'}
        minZoom={0.2}
      >
        <Controls position="top-left" style={{ color: '#000' }}></Controls>
        <Background variant={BackgroundVariant.Dots} size={3} gap={100}></Background>
        <Panel position="top-center">
          <button
            className="border-border hover:bg-hover bg-background border p-2 hover:cursor-pointer"
            onClick={saveFlow}
          >
            Save XML
          </button>
        </Panel>
      </ReactFlow>
      <ToastContainer position="bottom-right" theme={theme} closeOnClick={true} />
      <CreateNodeModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        addNodeAtPosition={addNodeAtPosition}
        positions={edgeDropPositions}
        sourceInfo={sourceInfoReference.current}
      />
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
