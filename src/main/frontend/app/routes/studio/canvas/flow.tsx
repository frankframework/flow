import {
  addEdge,
  Background,
  BackgroundVariant,
  ControlButton,
  Controls,
  type Edge,
  type Node,
  type OnConnectStart,
  type OnConnectEnd,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useUpdateNodeInternals,
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
import { useCallback, useEffect, useRef, useState } from 'react'
import { NodeContextMenuContext, useNodeContextMenu } from './node-context-menu-context'
import StickyNoteComponent, { type StickyNote } from '~/routes/studio/canvas/nodetypes/sticky-note'
import useTabStore, { type TabData } from '~/stores/tab-store'
import { convertAdapterXmlToJson, getAdapterFromConfiguration } from '~/routes/studio/xml-to-json-parser'
import { exportFlowToXml } from '~/routes/studio/flow-to-xml-parser'
import useNodeContextStore from '~/stores/node-context-store'
import CreateNodeModal from '~/components/flow/create-node-modal'
import { useFFDoc } from '@frankframework/doc-library-react'
import { useProjectStore } from '~/stores/project-store'
import { clearConfigurationCache, fetchConfigurationCached, saveConfiguration } from '~/services/configuration-service'
import { refreshOpenDiffs } from '~/services/git-service'
import useEditorTabStore from '~/stores/editor-tab-store'
import { cloneWithRemappedIds, getEdgeLabelFromHandle } from '~/utils/flow-utils'
import { showErrorToast } from '~/components/toast'
import clsx from 'clsx'
import { useSettingsStore } from '~/stores/settings-store'
import { useShortcut } from '~/hooks/use-shortcut'
import CanvasContextMenu from '~/components/flow/canvas-context-menu'

export type FlowNode = FrankNodeType | ExitNode | StickyNote | GroupNode | Node

const selector = (state: FlowState) => ({
  nodes: state.nodes,
  edges: state.edges,
  viewport: state.viewport,
  onNodesChange: state.onNodesChange,
  onEdgesChange: state.onEdgesChange,
  onConnect: state.onConnect,
  onReconnect: state.onReconnect,
})

type SaveStatus = 'idle' | 'saving' | 'saved'
const SAVED_DISPLAY_DURATION = 2000

function FlowCanvas() {
  const showNodeContextMenu = useNodeContextMenu()
  const [loading, setLoading] = useState(false)
  const {
    isEditing,
    isDirty,
    setIsEditing,
    setIsNewNode,
    setParentId,
    setChildParentId,
    setDraggedName,
    setEditingSubtype,
    setAttributes,
    setNodeId,
    allowedOnCanvas,
    setDropSuccessful,
  } = useNodeContextStore(
    useShallow((s) => ({
      isEditing: s.isEditing,
      isDirty: s.isDirty,
      setIsEditing: s.setIsEditing,
      setIsNewNode: s.setIsNewNode,
      setParentId: s.setParentId,
      setChildParentId: s.setChildParentId,
      setDraggedName: s.setDraggedName,
      setEditingSubtype: s.setEditingSubtype,
      setAttributes: s.setAttributes,
      setNodeId: s.setNodeId,
      allowedOnCanvas: s.allowedOnCanvas,
      setDropSuccessful: s.setDropSuccessful,
    })),
  )
  const { elements } = useFFDoc()
  const [showModal, setShowModal] = useState(false)
  const [edgeDropPositions, setEdgeDropPositions] = useState<{ x: number; y: number } | null>(null)
  const clipboardRef = useRef<{
    nodes: FlowNode[]
    edges: Edge[]
  } | null>(null)

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; flowPos: { x: number; y: number } } | null>(
    null,
  )
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLoadingTabRef = useRef(false)

  const nodeTypes = {
    frankNode: FrankNodeComponent,
    exitNode: ExitNodeComponent,
    stickyNote: StickyNoteComponent,
    groupNode: GroupNodeComponent,
  }
  const edgeTypes = { frankEdge: FrankEdgeComponent }
  const updateNodeInternals = useUpdateNodeInternals()
  const reactFlow = useReactFlow()
  const reactFlowRef = useRef(reactFlow)
  reactFlowRef.current = reactFlow

  const { nodes, edges, viewport, onNodesChange, onEdgesChange, onConnect, onReconnect } = useFlowStore(
    useShallow(selector),
  )
  const project = useProjectStore.getState().project

  const saveFlow = useCallback(async () => {
    const { nodes: flowNodes, edges: flowEdges, viewport: flowViewport } = useFlowStore.getState()
    const flowData = { nodes: flowNodes, edges: flowEdges, viewport: flowViewport }
    const currentProject = useProjectStore.getState().project
    const activeTabKey = useTabStore.getState().activeTab
    const tabData = useTabStore.getState().getTab(activeTabKey)
    const configurationPath = tabData?.configurationPath
    const adapterName = tabData?.name
    const adapterPosition = tabData?.adapterPosition

    if (!configurationPath || !adapterName || !currentProject) return

    setSaveStatus('saving')
    try {
      const fullConfigXml = await fetchConfigurationCached(currentProject.name, configurationPath)
      const configDoc = new DOMParser().parseFromString(fullConfigXml, 'text/xml')
      const allAdapters = [...configDoc.querySelectorAll('Adapter, adapter')]

      const existingAdapter =
        adapterPosition === undefined
          ? (allAdapters.find((a) => a.getAttribute('name') === adapterName) ?? null)
          : (allAdapters[adapterPosition] ?? null)

      if (!existingAdapter) {
        throw new Error(`Could not find adapter "${adapterName}" at position ${adapterPosition} in configuration`)
      }

      const existingAdapterXml = new XMLSerializer().serializeToString(existingAdapter)

      const newAdapterXml = await exportFlowToXml(
        flowData,
        currentProject.name,
        configurationPath,
        adapterName,
        existingAdapterXml,
      )

      const newAdapterDoc = new DOMParser().parseFromString(
        `<root xmlns:flow="urn:frank-flow">${newAdapterXml}</root>`,
        'text/xml',
      )
      const newAdapterEl = newAdapterDoc.querySelector('Adapter, adapter')
      if (!newAdapterEl) throw new Error('Failed to parse generated adapter XML')

      existingAdapter.parentNode!.replaceChild(configDoc.importNode(newAdapterEl, true), existingAdapter)

      const updatedConfigXml = new XMLSerializer().serializeToString(configDoc).replace(/^<\?xml[^?]*\?>\s*/, '')

      await saveConfiguration(currentProject.name, configurationPath, updatedConfigXml)
      clearConfigurationCache(currentProject.name, configurationPath)
      useEditorTabStore.getState().refreshAllTabs()
      if (currentProject.isGitRepository) await refreshOpenDiffs(currentProject.name)

      setSaveStatus('saved')
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), SAVED_DISPLAY_DURATION)
    } catch (error) {
      console.error('Failed to save XML:', error)
      showErrorToast(`Failed to save XML: ${error instanceof Error ? error.message : error}`)
      setSaveStatus('idle')
    }
  }, [project])

  const autosaveEnabled = useSettingsStore((s) => s.general.autoSave.enabled)
  const autosaveDelay = useSettingsStore((s) => s.general.autoSave.delayMs)

  const scheduleAutoSave = useCallback(() => {
    if (!autosaveEnabled) return
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setTimeout(() => {
      autoSaveTimerRef.current = null
      saveFlow()
    }, autosaveDelay)
  }, [saveFlow, autosaveEnabled, autosaveDelay])

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (nodes.length > 0 && !isLoadingTabRef.current) {
      scheduleAutoSave()
    }
  }, [nodes, edges, scheduleAutoSave])

  useEffect(() => {
    useNodeContextStore.getState().registerSaveFlow(async () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
        autoSaveTimerRef.current = null
      }
      await saveFlow()
    })
    return () => useNodeContextStore.getState().registerSaveFlow(null)
  }, [saveFlow])

  const sourceInfoReference = useRef<{
    nodeId: string | null
    handleId: string | null
    handleType: 'source' | 'target' | null
  }>({ nodeId: null, handleId: null, handleType: null })

  const handleConnectStart: OnConnectStart = (_, params) => {
    sourceInfoReference.current = {
      nodeId: params.nodeId,
      handleId: params.handleId,
      handleType: params.handleType,
    }
  }

  const handleConnectEnd: OnConnectEnd = (event, connectionState) => {
    if (!connectionState.isValid) {
      const mouseEvent = event as MouseEvent
      const x = mouseEvent.clientX
      const y = mouseEvent.clientY
      handleEdgeDropOnCanvas(x, y)
    }
  }

  const handleEdgeDropOnCanvas = (x: number, y: number) => {
    const { screenToFlowPosition } = reactFlow
    const flowPositions = screenToFlowPosition({ x: x, y: y })

    setEdgeDropPositions(flowPositions)
    setShowModal(true)
  }

  const layoutGraph = useCallback((nodes: Node[], edges: Edge[], direction: 'TB' | 'LR' = 'LR'): Node[] => {
    const dagreGraph = new Dagre.graphlib.Graph()
    dagreGraph.setDefaultEdgeLabel(() => ({}))
    dagreGraph.setGraph({
      rankdir: direction,
      ranksep: FlowConfig.LAYOUT_HORIZONTAL_OFFSET,
      nodesep: FlowConfig.LAYOUT_VERTICAL_OFFSET,
    })

    // Only add nodes to Dagre that need layout (position x=0 and y=0)
    for (const node of nodes) {
      if (node.position.x === 0 && node.position.y === 0) {
        dagreGraph.setNode(node.id, {
          width: node.width,
          height: node.height,
        })
      }
    }

    // Add all edges
    for (const edge of edges) {
      dagreGraph.setEdge(edge.source, edge.target)
    }

    Dagre.layout(dagreGraph)

    return nodes.map((node) => {
      if (node.position.x !== 0 || node.position.y !== 0) return node

      const nodeWithPosition = dagreGraph.node(node.id)
      if (!nodeWithPosition) return node

      return {
        ...node,
        position: {
          x: nodeWithPosition.x,
          y: nodeWithPosition.y,
        },

        measured: node.measured,
      }
    })
  }, [])

  const handleAutoLayout = useCallback(() => {
    const flowStore = useFlowStore.getState()
    const resetNodes = flowStore.nodes.map((node) => ({ ...node, position: { x: 0, y: 0 } }))
    const laidOut = layoutGraph(resetNodes, flowStore.edges, 'LR')
    flowStore.setNodes(laidOut)
    setTimeout(() => reactFlowRef.current.fitView({ padding: 0.1 }), 50)
  }, [layoutGraph])

  const getFullySelectedGroupIds = useCallback(
    (parentIds: (string | undefined)[], selectedNodes: FlowNode[]) => {
      return parentIds.filter((parentId) => {
        const children = nodes.filter((node) => node.parentId === parentId)
        return children.every((child) => selectedNodes.some((sn) => sn.id === child.id))
      })
    },
    [nodes],
  )

  const allSelectedInSameGroup = useCallback((selectedNodes: FlowNode[]) => {
    return selectedNodes.every((node) => node.parentId && node.parentId === selectedNodes[0].parentId)
  }, [])

  const degroupNodes = useCallback(
    (selectedNodes: FlowNode[], parentId: string | undefined, allNodes: FlowNode[]): FlowNode[] => {
      const groupNode = allNodes.find((node) => node.id === parentId)
      if (!groupNode) return allNodes

      const groupX = groupNode.position.x
      const groupY = groupNode.position.y

      return allNodes
        .map((node) => {
          if (node.id === parentId) {
            return null
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
    },
    [],
  )

  const handleDegroupSingleGroup = useCallback(
    (selectedNodes: FlowNode[]) => {
      const parentId = selectedNodes[0].parentId!
      const updatedNodes = degroupNodes(selectedNodes, parentId, nodes)
      useFlowStore.getState().setNodes(updatedNodes)
    },
    [nodes, degroupNodes],
  )

  const shouldMergeUngroupedIntoGroup = useCallback(
    (selectedNodes: FlowNode[]) => {
      const ungroupedNodes = selectedNodes.filter((n) => !n.parentId)
      const parentGroups = new Set(selectedNodes.map((n) => n.parentId).filter(Boolean))
      if (parentGroups.size === 1 && ungroupedNodes.length > 0) {
        const parentId = [...parentGroups][0]!
        const parentChildren = nodes.filter((n) => n.parentId === parentId)
        return parentChildren.every((child) => selectedNodes.some((s) => s.id === child.id))
      }
      return false
    },
    [nodes],
  )

  const handleMergeUngroupedIntoGroup = useCallback(
    (selectedNodes: FlowNode[]) => {
      const parentId = selectedNodes.find((n) => n.parentId)?.parentId
      const updatedNodes = degroupNodes(selectedNodes, parentId, nodes)
      const updatedSelectedNodes = updatedNodes.filter((node) =>
        selectedNodes.some((selectedNode) => selectedNode.id === node.id),
      )
      groupNodes(updatedSelectedNodes, updatedNodes)
    },
    [nodes, degroupNodes],
  )

  const handleMultiGroupMerge = useCallback(
    (groupIds: (string | undefined)[], selectedNodes: FlowNode[]) => {
      let updatedNodes = [...nodes]
      for (const parentId of groupIds) {
        const groupChildren = updatedNodes.filter((node) => node.parentId === parentId)
        updatedNodes = degroupNodes(groupChildren, parentId!, updatedNodes)
      }

      const degroupedSelectedNodes = updatedNodes.filter((node) =>
        selectedNodes.some((selected) => selected.id === node.id),
      )

      groupNodes(degroupedSelectedNodes, updatedNodes)
    },
    [nodes, degroupNodes],
  )

  const handleGrouping = useCallback(() => {
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
  }, [
    nodes,
    allSelectedInSameGroup,
    getFullySelectedGroupIds,
    handleDegroupSingleGroup,
    handleMergeUngroupedIntoGroup,
    handleMultiGroupMerge,
    shouldMergeUngroupedIntoGroup,
  ])

  const copySelection = useCallback(() => {
    const selectedNodes = nodes.filter((n) => n.selected)
    if (selectedNodes.length === 0) return

    const selectedNodeIds = new Set(selectedNodes.map((n) => n.id))
    const selectedEdges = edges.filter((e) => selectedNodeIds.has(e.source) && selectedNodeIds.has(e.target))

    const data = { nodes: selectedNodes, edges: selectedEdges }
    clipboardRef.current = data

    navigator.clipboard.writeText(JSON.stringify(data)).catch(() => {
      // clipboard write failed, ignore
    })
  }, [nodes, edges])

  const applyClipboardData = useCallback((clipboard: { nodes: FlowNode[]; edges: Edge[] }) => {
    const flowStore = useFlowStore.getState()
    const idMap = new Map<string, string>()
    const generateId = () => flowStore.getNextNodeId().toString()

    const newNodes: FlowNode[] = clipboard.nodes.map((node) => {
      const cloned = cloneWithRemappedIds(node, idMap, generateId)
      const remappedParentId = node.parentId ? idMap.get(node.parentId) : undefined
      return {
        ...cloned,
        position: {
          x: node.position.x + FlowConfig.COPY_PASTE_OFFSET,
          y: node.position.y + FlowConfig.COPY_PASTE_OFFSET,
        },
        parentId: remappedParentId,
        extent: remappedParentId ? 'parent' : undefined,
        selected: true,
      }
    })

    const newEdges: Edge[] = clipboard.edges.map((edge) => cloneWithRemappedIds(edge, idMap, generateId))

    const deselectedNodes = flowStore.nodes.map((n) => ({ ...n, selected: false }))
    const deselectedEdges = flowStore.edges.map((e) => ({ ...e, selected: false }))

    flowStore.setNodes([...deselectedNodes, ...newNodes])
    flowStore.setEdges([...deselectedEdges, ...newEdges])
  }, [])

  const pasteSelection = useCallback(() => {
    navigator.clipboard
      .readText()
      .then((text) => {
        try {
          const parsed = JSON.parse(text)
          if (parsed?.nodes && Array.isArray(parsed.nodes)) {
            applyClipboardData(parsed as { nodes: FlowNode[]; edges: Edge[] })
            return
          }
        } catch {
          // text is not valid JSON, fall through to clipboard ref
        }

        if (clipboardRef.current) applyClipboardData(clipboardRef.current)
      })
      .catch(() => {
        if (clipboardRef.current) applyClipboardData(clipboardRef.current)
      })
  }, [applyClipboardData])

  function closeEditNodeContextOnEscape(): void {
    const { isNewNode, nodeId, parentId } = useNodeContextStore.getState()

    if (isNewNode) {
      if (parentId) {
        useFlowStore.getState().deleteChild(parentId, nodeId.toString())
      } else {
        useFlowStore.getState().deleteNode(nodeId.toString())
      }
      useNodeContextStore.getState().setIsNewNode(false)
    }

    showNodeContextMenu(false)
    setIsEditing(false)
    setParentId(null)
    setChildParentId(null)
  }

  const deleteSelection = useCallback(() => {
    if (isEditing) return
    const { nodes, edges, setNodes, setEdges } = useFlowStore.getState()
    const selectedNodeIds = new Set(nodes.filter((n) => n.selected).map((n) => n.id))
    const hasSelection = selectedNodeIds.size > 0 || edges.some((e) => e.selected)
    if (!hasSelection) return
    setNodes(nodes.filter((n) => !n.selected))
    setEdges(edges.filter((e) => !e.selected && !selectedNodeIds.has(e.source) && !selectedNodeIds.has(e.target)))
  }, [isEditing])

  useShortcut({
    'studio.copy': () => copySelection(),
    'studio.paste': () => pasteSelection(),
    'studio.cut': () => cutSelection(),
    'studio.undo': () => useFlowStore.getState().undo(),
    'studio.redo': () => useFlowStore.getState().redo(),
    'studio.redo-alt': () => useFlowStore.getState().redo(),
    'studio.group': () => handleGrouping(),
    'studio.ungroup': () => handleUngroup(),
    'studio.save': () => saveFlow(),
    'studio.close-context': () => closeEditNodeContextOnEscape(),
    'studio.delete': () => deleteSelection(),
  })

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
      selectable: true,
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

  const onDragOver = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      event.dataTransfer.dropEffect = allowedOnCanvas ? 'move' : 'none'
    },
    [allowedOnCanvas],
  )

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setDraggedName(null)
    setParentId(null)

    const data = event.dataTransfer.getData('application/reactflow')
    if (!data) return

    setDropSuccessful(true)

    const parsedData = JSON.parse(data)
    const { screenToFlowPosition } = reactFlow

    if (elements) {
      const elementData = elements[parsedData.name]
      if (elementData) {
        setAttributes(elementData.attributes)
        setNodeId(+useFlowStore.getState().nodeIdCounter)
      }
    }

    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })
    addNodeAtPosition(position, parsedData.name)
  }

  const onDragEnd = () => {
    setDraggedName(null)
    setParentId(null)
  }

  function addNodeAtPosition(
    position: { x: number; y: number },
    elementName: string,
    sourceInfo?: { nodeId: string | null; handleId: string | null; handleType: 'source' | 'target' | null },
  ) {
    showNodeContextMenu(true)
    setIsNewNode(true)
    setEditingSubtype(elementName)
    setIsEditing(true)
    setParentId(null)
    setChildParentId(null)

    const flowStore = useFlowStore.getState()
    const newId = flowStore.getNextNodeId()

    const elementType = getElementTypeFromName(elementName)
    const nodeType = elementType === 'exit' ? 'exitNode' : 'frankNode'

    const width = nodeType === 'exitNode' ? FlowConfig.EXIT_DEFAULT_WIDTH : FlowConfig.NODE_DEFAULT_WIDTH
    const height = nodeType === 'exitNode' ? FlowConfig.EXIT_DEFAULT_HEIGHT : FlowConfig.NODE_MIN_HEIGHT

    const newNode: FrankNodeType = {
      id: newId.toString(),
      position: {
        x: position.x - width / 2,
        y: position.y - height / 2,
      },
      width: FlowConfig.NODE_DEFAULT_WIDTH,
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

    if (sourceInfo?.nodeId && sourceInfo.handleType === 'source') {
      const sourceNode = flowStore.nodes.find((node) => node.id === sourceInfo.nodeId)

      const label = getEdgeLabelFromHandle(sourceNode, sourceInfo.handleId)

      const newEdge: Edge = {
        id: `e${sourceInfo.nodeId}-${newId}`,
        source: sourceInfo.nodeId,
        sourceHandle: sourceInfo.handleId ?? undefined,
        target: newId.toString(),
        type: 'frankEdge',
        data: { label },
      }

      flowStore.setEdges(addEdge(newEdge, flowStore.edges))
      sourceInfoReference.current = { nodeId: null, handleId: null, handleType: null }
    }
  }

  const addStickyNote = useCallback((flowPos: { x: number; y: number }) => {
    const newId = useFlowStore.getState().getNextNodeId()

    const stickyNote: StickyNote = {
      id: newId,
      position: {
        x: flowPos.x,
        y: flowPos.y,
      },
      data: {
        content: 'New Sticky Note',
      },
      type: 'stickyNote',
    }
    useFlowStore.getState().addNode(stickyNote)
  }, [])

  const cutSelection = useCallback(() => {
    copySelection()
    const flowStore = useFlowStore.getState()
    const selectedNodes = flowStore.nodes.filter((n) => n.selected)
    if (selectedNodes.length === 0) return

    const selectedNodeIds = new Set(selectedNodes.map((n) => n.id))
    const remainingNodes = flowStore.nodes.filter((n) => !selectedNodeIds.has(n.id))
    const remainingEdges = flowStore.edges.filter(
      (e) => !selectedNodeIds.has(e.source) && !selectedNodeIds.has(e.target),
    )
    flowStore.setNodes(remainingNodes)
    flowStore.setEdges(remainingEdges)
  }, [copySelection])

  const handleUngroup = useCallback(() => {
    const flowStore = useFlowStore.getState()
    const selectedNodes = flowStore.nodes.filter((n) => n.selected)

    if (selectedNodes.length === 0) return
    const selectedGroupNodes = selectedNodes.filter((n) => n.type === 'groupNode')

    if (selectedGroupNodes.length > 0) {
      let updatedNodes = [...flowStore.nodes]
      for (const groupNode of selectedGroupNodes) {
        const groupId = groupNode.id

        const children = updatedNodes.filter((n) => n.parentId === groupId)

        updatedNodes = degroupNodes(children, groupId, updatedNodes)
      }
      flowStore.setNodes(updatedNodes)
      return
    }

    if (!allSelectedInSameGroup(selectedNodes)) return

    handleDegroupSingleGroup(selectedNodes)
  }, [allSelectedInSameGroup, handleDegroupSingleGroup, degroupNodes])

  const handleRightMouseButtonClick = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      const { screenToFlowPosition } = reactFlow
      const flowPos = screenToFlowPosition({ x: event.clientX, y: event.clientY })
      setContextMenu({ x: event.clientX, y: event.clientY, flowPos })
    },
    [reactFlow],
  )

  useEffect(() => {
    function restoreFlowFromTab(tab: TabData) {
      const flowStore = useFlowStore.getState()
      const flowJson = tab.flowJson

      if (flowJson) {
        flowStore.setNodes(Array.isArray(flowJson.nodes) ? flowJson.nodes : [])
        flowStore.setEdges(Array.isArray(flowJson.edges) ? flowJson.edges : [])
        const viewport = flowJson.viewport as { x: number; y: number; zoom: number } | undefined
        flowStore.setViewport(viewport && true ? viewport : { x: 0, y: 0, zoom: 1 })

        flowStore.setHistory(tab.history ?? [])
        flowStore.setFuture(tab.future ?? [])
      } else {
        clearFlow()
      }
    }

    function clearFlow() {
      const flowStore = useFlowStore.getState()
      flowStore.resetStore()
    }

    async function loadFlowFromTab(tab: TabData) {
      const flowStore = useFlowStore.getState()
      const currentProject = useProjectStore.getState().project
      isLoadingTabRef.current = true
      setLoading(true)
      try {
        if (tab.flowJson && Object.keys(tab.flowJson).length > 0) {
          restoreFlowFromTab(tab)
        } else if (tab.configurationPath && tab.name) {
          if (!currentProject) return
          const adapter = await getAdapterFromConfiguration(
            currentProject.name,
            tab.configurationPath,
            tab.name,
            tab.adapterPosition,
          )
          if (!adapter) return
          const adapterJson = await convertAdapterXmlToJson(adapter)
          flowStore.setEdges(adapterJson.edges)
          flowStore.setViewport({ x: 0, y: 0, zoom: 1 })
          const laidOutNodes = layoutGraph(adapterJson.nodes, adapterJson.edges, 'LR')
          flowStore.setNodes(laidOutNodes)
          flowStore.setHistory([])
          flowStore.setFuture([])
        }
      } catch (error) {
        console.error('Error loading tab flow:', error)
      } finally {
        setLoading(false)
        setTimeout(() => {
          isLoadingTabRef.current = false
        }, 0)
      }
    }

    function saveFlowToTab(tabId: string) {
      const tabStore = useTabStore.getState()
      const flowStore = useFlowStore.getState()

      const flowData = reactFlowRef.current.toObject()
      const viewport = flowStore.viewport
      const tabData = tabStore.getTab(tabId)

      if (!tabData) return

      tabStore.setTabData(tabId, {
        ...tabData,
        flowJson: {
          ...flowData,
          viewport,
        },
        history: flowStore.history,
        future: flowStore.future,
      })
    }

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
  }, [layoutGraph])

  // Listen for node data changes to trigger internals update for connected edges and handles
  // Added for undo/redo and direct data changes to ensure handles stay positioned properly
  useEffect(() => {
    const unsub = useFlowStore.subscribe(
      (state) => state.nodes, // selector: subscribe only to nodes
      (newNodes, oldNodes) => {
        if (!reactFlowRef.current || !oldNodes) return

        // Compare old vs new node data
        for (const newNode of newNodes) {
          const oldNode = oldNodes.find((oldNode) => oldNode.id === newNode.id)
          if (!oldNode) continue

          if (oldNode.data !== newNode.data) {
            updateNodeInternals(newNode.id)
          }
        }
      },
    )

    return () => unsub()
  }, [updateNodeInternals])

  return (
    <div
      className="relative h-full w-full"
      id="flow-canvas"
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onContextMenu={handleRightMouseButtonClick}
    >
      {loading && (
        <div className="bg-opacity-80 bg-background absolute inset-0 z-50 flex items-center justify-center">
          <div className="border-border h-10 w-10 animate-spin rounded-full border-t-2 border-b-2"></div>
        </div>
      )}

      {isEditing && (
        <div className="pointer-events-none absolute inset-0 z-10">
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded bg-black/30 px-3 py-2 text-xs text-white backdrop-blur-sm">
            <span>
              <kbd className="rounded border border-white/40 bg-white/15 px-1.5 py-0.5 font-mono text-xs text-white">
                Esc
              </kbd>{' '}
              Discard
            </span>
            <span className="opacity-40">|</span>
            <span>
              <kbd className="rounded border border-white/40 bg-white/15 px-1.5 py-0.5 font-mono text-xs text-white">
                Ctrl+Enter
              </kbd>{' '}
              Save
            </span>
          </div>
        </div>
      )}

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
        onPaneClick={() => {
          setContextMenu(null)
          if (isEditing && !isDirty) {
            showNodeContextMenu(false)
            setIsEditing(false)
            setParentId(null)
            setChildParentId(null)
          }
        }}
        deleteKeyCode={null}
        minZoom={0.2}
      >
        <Controls position="top-left" style={{ color: '#000' }}>
          <ControlButton onClick={handleAutoLayout} title="Auto layout">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="5" height="5" rx="1" />
              <rect x="10" y="3" width="5" height="5" rx="1" />
              <rect x="3" y="16" width="5" height="5" rx="1" />
              <rect x="10" y="16" width="5" height="5" rx="1" />
              <line x1="17" y1="5.5" x2="21" y2="5.5" />
              <line x1="17" y1="18.5" x2="21" y2="18.5" />
              <line x1="21" y1="5.5" x2="21" y2="18.5" />
            </svg>
          </ControlButton>
        </Controls>
        <Background variant={BackgroundVariant.Dots} size={3} gap={100}></Background>
      </ReactFlow>

      <div className="absolute top-2 left-1/2 -translate-x-1/2">
        <span
          className={clsx(
            'text-muted-foreground rounded bg-black/30 px-2 py-1 text-xs backdrop-blur-sm transition-opacity duration-300',
            saveStatus === 'idle' ? 'opacity-0' : 'opacity-100',
          )}
        >
          {saveStatus === 'saving' && 'Saving...'}
          {saveStatus === 'saved' && 'Saved'}
        </span>
      </div>

      <CreateNodeModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        addNodeAtPosition={addNodeAtPosition}
        positions={edgeDropPositions}
        sourceInfo={sourceInfoReference.current}
      />

      {contextMenu && (
        <CanvasContextMenu
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={() => setContextMenu(null)}
          onAddNote={() => addStickyNote(contextMenu.flowPos)}
          onGroup={handleGrouping}
          onUngroup={handleUngroup}
          onCut={cutSelection}
          onCopy={copySelection}
          onPaste={pasteSelection}
          hasSelection={nodes.some((n) => n.selected)}
          hasGroupedSelection={nodes.some((n) => n.selected) && allSelectedInSameGroup(nodes.filter((n) => n.selected))}
          hasClipboard={clipboardRef.current !== null}
        />
      )}
    </div>
  )
}

export default function Flow({ showNodeContextMenu }: Readonly<{ showNodeContextMenu: (b: boolean) => void }>) {
  return (
    <NodeContextMenuContext.Provider value={showNodeContextMenu}>
      <ReactFlowProvider>
        <FlowCanvas />
      </ReactFlowProvider>
    </NodeContextMenuContext.Provider>
  )
}
