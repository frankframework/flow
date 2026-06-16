import {
  addEdge,
  Background,
  BackgroundVariant,
  ControlButton,
  Controls,
  type Connection,
  type Edge,
  type Node,
  type OnConnectStart,
  type OnConnectEnd,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useReactFlow,
  useUpdateNodeInternals,
} from '@xyflow/react'
import Dagre from '@dagrejs/dagre'
import { useNavigate } from 'react-router'
import { SaveStatusIndicator } from '~/components/save-status-indicator'
import { useSaveStatusStore } from '~/stores/save-status-store'
import Button from '~/components/inputs/button'
import CodeIcon from '/icons/solar/Code.svg?react'
import '@xyflow/react/dist/style.css'
import FrankNodeComponent, { type FrankNodeType } from '~/routes/studio/canvas/nodetypes/frank-node'
import FrankEdgeComponent from '~/routes/studio/canvas/edgetypes/frank-edge'
import ExitNodeComponent, { type ExitNode } from '~/routes/studio/canvas/nodetypes/exit-node'
import GroupNodeComponent, { type GroupNode } from '~/routes/studio/canvas/nodetypes/group-node'
import useFlowStore, { isStickyNote, type FlowState } from '~/stores/flow-store'
import { useShallow } from 'zustand/react/shallow'
import { FlowConfig } from '~/routes/studio/canvas/flow.config'
import { getElementTypeFromName } from '~/routes/studio/node-translator-module'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { logApiError } from '~/utils/logger'
import { NodeContextMenuContext, useNodeContextMenu } from './node-context-menu-context'
import StickyNoteComponent, { type StickyNote } from '~/routes/studio/canvas/nodetypes/sticky-note'
import useTabStore, { type TabData } from '~/stores/tab-store'
import { convertAdapterXmlToJson, getAdapterFromConfiguration } from '~/routes/studio/xml-to-json-parser'
import { exportFlowToXml, replaceAdapterInXml } from '~/routes/studio/flow-to-xml-parser'
import useNodeContextStore from '~/stores/node-context-store'
import CreateNodeModal from '~/components/flow/create-node-modal'
import { useFFDoc } from '@frankframework/doc-library-react'
import type { ElementDetails } from '@frankframework/doc-library-core'
import { useProjectStore } from '~/stores/project-store'
import {
  clearConfigurationFileCache,
  fetchConfigurationFileCached,
  saveConfigurationFile,
} from '~/services/configuration-file-service'
import { refreshOpenDiffs } from '~/services/git-service'
import useEditorTabStore from '~/stores/editor-tab-store'
import { cloneWithRemappedIds, getEdgeLabelFromHandle } from '~/utils/flow-utils'
import { showErrorToast } from '~/components/toast'
import { useSettingsStore } from '~/stores/settings-store'
import { useShortcut } from '~/hooks/use-shortcut'
import CanvasContextMenu from '~/components/flow/canvas-context-menu'
import { useSidebarStore, SidebarSide } from '~/stores/sidebar-layout-store'
import { openInEditorAtElement } from '~/actions/navigationActions'
import HandleMenu from '~/routes/studio/canvas/nodetypes/components/handle-menu'

export type FlowNode = FrankNodeType | ExitNode | StickyNote | GroupNode | Node

const selector = (state: FlowState) => ({
  nodes: state.nodes,
  edges: state.edges,
  onNodesChange: state.onNodesChange,
  onEdgesChange: state.onEdgesChange,
  onConnect: state.onConnect,
  onReconnect: state.onReconnect,
})

const STICKY_SNAP_DISTANCE = 60

const getStickyCenter = (sticky: StickyNote) => ({
  x: sticky.position.x + (sticky.measured?.width ?? FlowConfig.STICKY_NOTE_DEFAULT_WIDTH) / 2,
  y: sticky.position.y + (sticky.measured?.height ?? FlowConfig.STICKY_NOTE_DEFAULT_HEIGHT) / 2,
})

const isWithinSnapDistance = (sticky: StickyNote, frankNode: FlowNode) => {
  const center = getStickyCenter(sticky)
  return (
    center.x >= frankNode.position.x - STICKY_SNAP_DISTANCE &&
    center.x <=
      frankNode.position.x + (frankNode.measured?.width ?? FlowConfig.NODE_DEFAULT_WIDTH) + STICKY_SNAP_DISTANCE &&
    center.y >= frankNode.position.y - STICKY_SNAP_DISTANCE &&
    center.y <= frankNode.position.y + (frankNode.measured?.height ?? FlowConfig.NODE_MIN_HEIGHT) + STICKY_SNAP_DISTANCE
  )
}

const distanceToFrankNode = (sticky: StickyNote, frankNode: FlowNode) => {
  const center = getStickyCenter(sticky)
  const dx = center.x - (frankNode.position.x + (frankNode.measured?.width ?? FlowConfig.NODE_DEFAULT_WIDTH) / 2)
  const dy = center.y - (frankNode.position.y + (frankNode.measured?.height ?? FlowConfig.NODE_MIN_HEIGHT) / 2)
  return Math.hypot(dx, dy)
}

const isFrankNode = (node: FlowNode): node is FrankNodeType => node.type === 'frankNode' || node.type === 'exitNode'

const findNearestFrankNode = (sticky: StickyNote, candidates: FlowNode[]) =>
  candidates
    .filter((n) => (n.type === 'frankNode' || n.type === 'exitNode') && isWithinSnapDistance(sticky, n))
    .reduce<FlowNode | null>((best, n) => {
      if (best === null) return n
      return distanceToFrankNode(sticky, n) < distanceToFrankNode(sticky, best) ? n : best
    }, null)

const nodeTypes = {
  frankNode: FrankNodeComponent,
  exitNode: ExitNodeComponent,
  stickyNote: StickyNoteComponent,
  groupNode: GroupNodeComponent,
}
const edgeTypes = { frankEdge: FrankEdgeComponent }

function computeAbsoluteNodePosition(
  targetNode: FlowNode,
  allNodes: FlowNode[],
): { absoluteX: number; absoluteY: number } {
  let absoluteX = targetNode.position.x
  let absoluteY = targetNode.position.y
  let currentNode: FlowNode | undefined = targetNode

  while (currentNode?.parentId) {
    const parentNode = allNodes.find((node) => node.id === currentNode!.parentId)
    if (!parentNode) break
    absoluteX += parentNode.position.x
    absoluteY += parentNode.position.y
    currentNode = parentNode
  }

  return { absoluteX, absoluteY }
}

function computeNodeCenteredViewport(
  nodeAbsoluteX: number,
  nodeAbsoluteY: number,
  nodeWidth: number,
  nodeHeight: number,
  canvasWidth: number,
  canvasHeight: number,
): { x: number; y: number; zoom: number } {
  const nodeCenterX = nodeAbsoluteX + nodeWidth / 2
  const nodeCenterY = nodeAbsoluteY + nodeHeight / 2
  const viewportPadding = 0.7
  const minZoom = 0.5
  const maxZoom = 1.5

  const zoomToFitWidth = (canvasWidth * viewportPadding) / nodeWidth
  const zoomToFitHeight = (canvasHeight * viewportPadding) / nodeHeight
  const zoom = Math.max(minZoom, Math.min(maxZoom, Math.min(zoomToFitWidth, zoomToFitHeight)))

  return {
    x: canvasWidth / 2 - nodeCenterX * zoom,
    y: canvasHeight / 2 - nodeCenterY * zoom,
    zoom,
  }
}

function FlowCanvas({ onOpenInEditor }: { onOpenInEditor: () => void }) {
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
    setIsMultiSelect,
    setSelectedStickyId,
    setSelectedGroupId,
  } = useNodeContextStore(
    useShallow((store) => ({
      isEditing: store.isEditing,
      isDirty: store.isDirty,
      setIsEditing: store.setIsEditing,
      setIsNewNode: store.setIsNewNode,
      setParentId: store.setParentId,
      setChildParentId: store.setChildParentId,
      setDraggedName: store.setDraggedName,
      setEditingSubtype: store.setEditingSubtype,
      setAttributes: store.setAttributes,
      setNodeId: store.setNodeId,
      allowedOnCanvas: store.allowedOnCanvas,
      setDropSuccessful: store.setDropSuccessful,
      setIsMultiSelect: store.setIsMultiSelect,
      setSelectedStickyId: store.setSelectedStickyId,
      selectedStickyId: store.selectedStickyId,
      setSelectedGroupId: store.setSelectedGroupId,
    })),
  )
  const { elements } = useFFDoc()
  const elementsRef = useRef(elements)
  const showNodeContextMenuRef = useRef(showNodeContextMenu)
  const navigate = useNavigate()

  useEffect(() => {
    elementsRef.current = elements
  }, [elements])

  useEffect(() => {
    showNodeContextMenuRef.current = showNodeContextMenu
  }, [showNodeContextMenu])

  const [showModal, setShowModal] = useState(false)
  const [edgeDropPositions, setEdgeDropPositions] = useState<{ x: number; y: number } | null>(null)
  const [pendingCompactConnection, setPendingCompactConnection] = useState<{
    connection: Connection
    sourceNodeSubtype: string
    position: { x: number; y: number }
  } | null>(null)
  const [pendingEdgeDrop, setPendingEdgeDrop] = useState<{
    position: { x: number; y: number }
    sourceNodeSubtype: string
  } | null>(null)

  const [edgeDropHandleType, setEdgeDropHandleType] = useState<string | null>(null)

  const clipboardRef = useRef<{
    nodes: FlowNode[]
    edges: Edge[]
  } | null>(null)

  const { setSaving, setSaved, setIdle } = useSaveStatusStore()
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; flowPos: { x: number; y: number } } | null>(
    null,
  )
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLoadingTabRef = useRef(false)
  const pendingFitViewRef = useRef<string | null>(null)

  const updateNodeInternals = useUpdateNodeInternals()
  const reactFlow = useReactFlow()
  const reactFlowRef = useRef(reactFlow)
  reactFlowRef.current = reactFlow
  const nodesInitialized = useNodesInitialized()
  const canvasRef = useRef<HTMLDivElement>(null)
  const fitAfterLayoutRef = useRef<{ id: string }[] | null>(null)
  const pendingInitialRelayoutRef = useRef<{ pendingSelection: { subtype: string; name: string } | null } | null>(null)
  const [relayoutNonce, setRelayoutNonce] = useState(0)
  const loadedTabIdRef = useRef<string | null>(null)

  const applySelectionToNodes = useCallback((pendingSelection: { subtype: string; name: string }) => {
    const currentNodes = useFlowStore.getState().nodes
    const nodeToSelect = currentNodes.find(
      (node): node is FrankNodeType =>
        isFrankNode(node) && node.data.subtype === pendingSelection.subtype && node.data.name === pendingSelection.name,
    )

    if (!nodeToSelect) return

    useFlowStore.getState().setNodes(
      currentNodes.map((node) => ({
        ...node,
        selected: node.id === nodeToSelect.id,
      })),
    )

    pendingFitViewRef.current = nodeToSelect.id

    const nodeContextStore = useNodeContextStore.getState()
    nodeContextStore.setParentId(null)
    nodeContextStore.setChildParentId(null)
    nodeContextStore.setNodeId(+nodeToSelect.id)
    nodeContextStore.setAttributes(elementsRef.current?.[nodeToSelect.data.subtype]?.attributes)
    nodeContextStore.setEditingSubtype(nodeToSelect.data.subtype)
    nodeContextStore.setIsEditing(true)
    showNodeContextMenuRef.current(true)
  }, [])

  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onReconnect } = useFlowStore(useShallow(selector))

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

    setSaving()
    try {
      const fullConfigXml = await fetchConfigurationFileCached(currentProject.name, configurationPath)
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

      const adapterIndex = allAdapters.indexOf(existingAdapter)
      if (adapterIndex === -1) showErrorToast('Could not determine adapter position for replacement')

      const updatedConfigXml = replaceAdapterInXml(fullConfigXml, adapterIndex, newAdapterXml.trim())

      await saveConfigurationFile(currentProject.name, configurationPath, updatedConfigXml, true)
      clearConfigurationFileCache(currentProject.name, configurationPath)
      useEditorTabStore.getState().refreshAllTabs()
      if (currentProject.isGitRepository) await refreshOpenDiffs(currentProject.name)

      const tabData = useTabStore.getState().getTab(activeTabKey)

      if (tabData) {
        const { nodes: savedNodes, edges: savedEdges, viewport: savedViewport } = useFlowStore.getState()
        useTabStore.getState().setTabData(activeTabKey, {
          ...tabData,
          flowJson: { nodes: savedNodes, edges: savedEdges, viewport: savedViewport },
        })
      }

      setSaved()
    } catch (error) {
      logApiError('Failed to save XML', error as Error)
      setIdle()
    }
  }, [])

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
    }
  }, [])

  useEffect(() => {
    if (nodes.length > 0 && !isLoadingTabRef.current) {
      scheduleAutoSave()
    }
  }, [nodes, edges, scheduleAutoSave])

  useEffect(() => {
    if (!fitAfterLayoutRef.current) return
    const nodeIds = fitAfterLayoutRef.current
    fitAfterLayoutRef.current = null
    requestAnimationFrame(() => {
      reactFlowRef.current?.fitView({ nodes: nodeIds, padding: 0.15, duration: 300 })
    })
  }, [nodes])

  const waitForStableCanvasDimensions = useCallback((onStable: (canvasWidth: number, canvasHeight: number) => void) => {
    let previousWidth = -1
    let previousHeight = -1
    let consecutiveStableFrames = 0
    let totalFramesElapsed = 0
    const MAX_FRAMES_BEFORE_TIMEOUT = 60
    const REQUIRED_STABLE_FRAMES = 3
    const MINIMUM_TOTAL_FRAMES = 5

    const checkDimensions = () => {
      const currentWidth = canvasRef.current?.clientWidth ?? 0
      const currentHeight = canvasRef.current?.clientHeight ?? 0

      const hasValidDimensions = currentWidth > 0 && currentHeight > 0
      const dimensionsUnchanged = currentWidth === previousWidth && currentHeight === previousHeight

      if (hasValidDimensions && dimensionsUnchanged) {
        consecutiveStableFrames++
        const isStableEnough = consecutiveStableFrames >= REQUIRED_STABLE_FRAMES
        const hasWaitedLongEnough = totalFramesElapsed >= MINIMUM_TOTAL_FRAMES

        if (isStableEnough && hasWaitedLongEnough) {
          onStable(currentWidth, currentHeight)
          return
        }
      } else {
        consecutiveStableFrames = 0
      }

      previousWidth = currentWidth
      previousHeight = currentHeight
      totalFramesElapsed++

      if (totalFramesElapsed >= MAX_FRAMES_BEFORE_TIMEOUT) {
        if (currentWidth > 0 && currentHeight > 0) {
          onStable(currentWidth, currentHeight)
        }
        return
      }

      requestAnimationFrame(checkDimensions)
    }

    requestAnimationFrame(checkDimensions)
  }, [])

  useEffect(() => {
    const nodeId = pendingFitViewRef.current
    if (!nodeId) return

    const targetNode = nodes.find((node) => node.id === nodeId)
    if (!targetNode?.measured?.width || !targetNode?.measured?.height) return
    if (!targetNode.selected) return

    pendingFitViewRef.current = null

    waitForStableCanvasDimensions((canvasWidth, canvasHeight) => {
      const reactFlowInstance = reactFlowRef.current
      if (!reactFlowInstance) return

      const allNodes = useFlowStore.getState().nodes
      const node = allNodes.find((node) => node.id === nodeId)
      if (!node?.measured?.width || !node?.measured?.height) return

      const { absoluteX, absoluteY } = computeAbsoluteNodePosition(node, allNodes)

      const viewport = computeNodeCenteredViewport(
        absoluteX,
        absoluteY,
        node.measured.width,
        node.measured.height,
        canvasWidth,
        canvasHeight,
      )

      reactFlowInstance.setViewport(viewport, { duration: 400 })
    })
  }, [nodes, waitForStableCanvasDimensions])

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
    const mouseEvent = event as MouseEvent
    if (!connectionState.isValid) {
      const zoom = reactFlow.getZoom()
      if (zoom < 0.4 && sourceInfoReference.current.handleType === 'source') {
        const { nodes } = useFlowStore.getState()
        const sourceNode = nodes.find((node) => node.id === sourceInfoReference.current.nodeId)
        if (sourceNode && isFrankNode(sourceNode)) {
          setPendingEdgeDrop({
            position: { x: mouseEvent.clientX, y: mouseEvent.clientY },
            sourceNodeSubtype: sourceNode.data.subtype,
          })
          return
        }
      }
      handleEdgeDropOnCanvas(mouseEvent.clientX, mouseEvent.clientY)
    }
  }

  const handleConnect = useCallback(
    (connection: Connection) => {
      const zoom = reactFlow.getZoom()

      if (zoom < 0.4 && connection.source) {
        const { nodes } = useFlowStore.getState()
        const sourceNode = nodes.find((node) => node.id === connection.source)

        if (sourceNode && isFrankNode(sourceNode)) {
          const targetNode = nodes.find((node) => node.id === connection.target)
          const position = targetNode
            ? reactFlow.flowToScreenPosition({
                x: targetNode.position.x + (targetNode.measured?.width ?? FlowConfig.NODE_DEFAULT_WIDTH) / 2,
                y: targetNode.position.y + (targetNode.measured?.height ?? FlowConfig.NODE_ZOOMED_OUT_HEIGHT) / 2,
              })
            : { x: window.innerWidth / 2, y: window.innerHeight / 2 }

          setPendingCompactConnection({
            connection,
            sourceNodeSubtype: sourceNode.data.subtype,
            position,
          })
          return
        }
      }

      onConnect(connection)
    },
    [onConnect, reactFlow],
  )

  const handleCompactHandleSelect = useCallback(
    (type: string) => {
      if (!pendingCompactConnection) return

      const { nodes } = useFlowStore.getState()
      const sourceNode = nodes.find((node) => node.id === pendingCompactConnection.connection.source)

      if (!sourceNode || !isFrankNode(sourceNode)) {
        setPendingCompactConnection(null)
        return
      }

      const existingHandle = sourceNode.data.sourceHandles.find((handle) => handle.type === type)

      if (existingHandle) {
        onConnect({
          ...pendingCompactConnection.connection,
          sourceHandle: existingHandle.index.toString(),
        })
      } else {
        const newIndex = sourceNode.data.sourceHandles.length + 1
        useFlowStore.getState().addHandle(pendingCompactConnection.connection.source!, { type, index: newIndex })
        onConnect({
          ...pendingCompactConnection.connection,
          sourceHandle: newIndex.toString(),
        })
      }

      setPendingCompactConnection(null)
    },
    [pendingCompactConnection, onConnect],
  )

  const handleEdgeDropOnCanvas = (x: number, y: number) => {
    const { screenToFlowPosition } = reactFlow
    const flowPositions = screenToFlowPosition({ x: x, y: y })

    setEdgeDropPositions(flowPositions)
    setShowModal(true)
  }

  const handleEdgeDropHandleSelect = useCallback(
    (type: string) => {
      if (!pendingEdgeDrop) return
      const flowPositions = reactFlow.screenToFlowPosition(pendingEdgeDrop.position)
      setEdgeDropHandleType(type)
      setEdgeDropPositions(flowPositions)
      setPendingEdgeDrop(null)
      setShowModal(true)
    },
    [pendingEdgeDrop, reactFlow],
  )

  const computeAdapterCenteredViewport = useCallback(
    (nodes: Node[], canvasWidth: number, canvasHeight: number): { x: number; y: number; zoom: number } => {
      const layoutNodes = nodes.filter((node) => node.type === 'frankNode' || node.type === 'exitNode')
      if (layoutNodes.length === 0) return { x: 0, y: 0, zoom: 1 }

      const boundsLeft = Math.min(...layoutNodes.map((node) => node.position.x))
      const boundsTop = Math.min(...layoutNodes.map((node) => node.position.y))
      const boundsRight = Math.max(
        ...layoutNodes.map((node) => node.position.x + (node.measured?.width ?? FlowConfig.NODE_DEFAULT_WIDTH)),
      )
      const boundsBottom = Math.max(
        ...layoutNodes.map((node) => node.position.y + (node.measured?.height ?? FlowConfig.NODE_MIN_HEIGHT)),
      )

      const boundsWidth = boundsRight - boundsLeft
      const boundsHeight = boundsBottom - boundsTop
      const boundsCenterX = boundsLeft + boundsWidth / 2
      const boundsCenterY = boundsTop + boundsHeight / 2

      const viewportPadding = 0.85
      const minZoom = 0.2
      const maxZoom = 1.5
      const verticalOffset = 40

      const zoomToFitWidth = (canvasWidth * viewportPadding) / Math.max(boundsWidth, 1)
      const zoomToFitHeight = (canvasHeight * viewportPadding) / Math.max(boundsHeight, 1)
      const zoom = Math.max(minZoom, Math.min(maxZoom, Math.min(zoomToFitWidth, zoomToFitHeight)))

      return {
        x: canvasWidth / 2 - boundsCenterX * zoom,
        y: canvasHeight / 2 - boundsCenterY * zoom - verticalOffset,
        zoom,
      }
    },
    [],
  )

  const layoutGraph = useCallback((nodes: Node[], edges: Edge[], direction: 'TB' | 'LR' = 'LR'): Node[] => {
    const dagreGraph = new Dagre.graphlib.Graph()
    dagreGraph.setDefaultEdgeLabel(() => ({}))
    dagreGraph.setGraph({
      rankdir: direction,
      ranksep: FlowConfig.LAYOUT_HORIZONTAL_OFFSET,
      nodesep: FlowConfig.LAYOUT_VERTICAL_OFFSET,
    })

    const layoutableIds = new Set<string>()
    for (const node of nodes) {
      if ((node.type === 'frankNode' || node.type === 'exitNode') && node.position.x === 0 && node.position.y === 0) {
        const width = node.measured?.width ?? FlowConfig.NODE_DEFAULT_WIDTH
        const height = node.measured?.height ?? FlowConfig.NODE_MIN_HEIGHT
        dagreGraph.setNode(node.id, { width: width, height: height })
        layoutableIds.add(node.id)
      }
    }

    for (const edge of edges) {
      if (layoutableIds.has(edge.source) && layoutableIds.has(edge.target)) {
        dagreGraph.setEdge(edge.source, edge.target)
      }
    }

    Dagre.layout(dagreGraph)

    return nodes.map((node) => {
      if (!layoutableIds.has(node.id)) return node

      const nodeWithPosition = dagreGraph.node(node.id)
      if (!nodeWithPosition) return node

      const width = node.measured?.width ?? FlowConfig.NODE_DEFAULT_WIDTH
      const height = node.measured?.height ?? FlowConfig.NODE_MIN_HEIGHT

      return {
        ...node,
        position: {
          x: nodeWithPosition.x - width / 2,
          y: nodeWithPosition.y - height / 2,
        },
      }
    })
  }, [])

  const handleAutoLayout = useCallback(() => {
    const flowStore = useFlowStore.getState()
    const resetNodes = flowStore.nodes.map((node) =>
      node.type === 'frankNode' || node.type === 'exitNode' ? { ...node, position: { x: 0, y: 0 } } : node,
    )
    const laidOut = layoutGraph(resetNodes, flowStore.edges, 'LR')

    const nodeIds = laidOut
      .filter((node) => node.type === 'frankNode' || node.type === 'exitNode')
      .map((node) => ({ id: node.id }))

    if (nodeIds.length === 0) return

    fitAfterLayoutRef.current = nodeIds
    flowStore.setNodes(laidOut)
  }, [layoutGraph])

  useEffect(() => {
    if (!nodesInitialized || !pendingInitialRelayoutRef.current) return

    const { pendingSelection } = pendingInitialRelayoutRef.current
    pendingInitialRelayoutRef.current = null

    const flowStore = useFlowStore.getState()
    const nodesWithResetPositions = flowStore.nodes.map((node) =>
      node.type === 'frankNode' || node.type === 'exitNode' ? { ...node, position: { x: 0, y: 0 } } : node,
    )
    const laidOutNodes = layoutGraph(nodesWithResetPositions, flowStore.edges, 'LR')
    flowStore.setNodes(laidOutNodes)

    if (pendingSelection) {
      applySelectionToNodes(pendingSelection)
    } else {
      waitForStableCanvasDimensions((canvasWidth, canvasHeight) => {
        const freshViewport = computeAdapterCenteredViewport(laidOutNodes, canvasWidth, canvasHeight)
        useFlowStore.getState().setViewport(freshViewport)
        reactFlowRef.current?.setViewport(freshViewport)
      })
    }
  }, [
    nodesInitialized,
    relayoutNonce,
    layoutGraph,
    waitForStableCanvasDimensions,
    computeAdapterCenteredViewport,
    applySelectionToNodes,
  ])

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
      showNodeContextMenu(true)
      return
    }

    if (allSelectedInSameGroup(selectedNodes)) return

    if (shouldMergeUngroupedIntoGroup(selectedNodes)) {
      handleMergeUngroupedIntoGroup(selectedNodes)
      showNodeContextMenu(true)
      return
    }

    groupNodes(selectedNodes, nodes)
    showNodeContextMenu(true)
  }, [
    nodes,
    allSelectedInSameGroup,
    getFullySelectedGroupIds,
    handleMergeUngroupedIntoGroup,
    handleMultiGroupMerge,
    shouldMergeUngroupedIntoGroup,
    showNodeContextMenu,
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
    setIsMultiSelect(false)
    setParentId(null)
    setChildParentId(null)
  }

  const deleteSelection = useCallback((): boolean => {
    if (isEditing) return false

    const { parentId: storeParentId, nodeId: storeNodeId } = useNodeContextStore.getState()
    if (storeParentId !== null) {
      useFlowStore.getState().deleteChild(storeParentId, storeNodeId.toString())
      useNodeContextStore.getState().setParentId(null)
      useNodeContextStore.getState().setChildParentId(null)
      useNodeContextStore.getState().setNodeId(0)
      showNodeContextMenu(false)
      return true
    }

    const { nodes, edges, setNodes, setEdges } = useFlowStore.getState()
    const selectedNodeIds = new Set(nodes.filter((n) => n.selected).map((n) => n.id))
    const hasSelection = selectedNodeIds.size > 0 || edges.some((e) => e.selected)
    if (!hasSelection) return false

    const { selectedStickyId } = useNodeContextStore.getState()
    if (selectedStickyId && selectedNodeIds.has(selectedStickyId)) {
      useNodeContextStore.getState().setSelectedStickyId(null)
      showNodeContextMenu(false)
    }

    setNodes(nodes.filter((n) => !n.selected))
    setEdges(edges.filter((e) => !e.selected && !selectedNodeIds.has(e.source) && !selectedNodeIds.has(e.target)))
    return true
  }, [isEditing, showNodeContextMenu])

  useShortcut({
    'studio.copy': () => copySelection(),
    'studio.paste': () => pasteSelection(),
    'studio.cut': () => cutSelection(),
    'studio.undo': () => useFlowStore.getState().undo(),
    'studio.redo': () => useFlowStore.getState().redo(),
    'studio.redo-alt': () => useFlowStore.getState().redo(),
    'studio.group': () => handleGrouping(),
    'studio.ungroup': () => handleUngroup(),
    'studio.save': () => void saveFlow(),
    'studio.close-context': () => closeEditNodeContextOnEscape(),
    'studio.delete': () => deleteSelection(),
    'studio.show-in-editor': () => showSelectedNodeInEditor(),
  })

  const handleNodeDragStop = useCallback((_event: React.MouseEvent, node: FlowNode) => {
    if (!isStickyNote(node)) return

    const flowStore = useFlowStore.getState()
    const nearest = findNearestFrankNode(node as StickyNote, flowStore.nodes)
    if (!nearest) return

    flowStore.setStickyAttachment(node.id, nearest.id)
    void useNodeContextStore.getState().saveFlow?.()
  }, [])

  const lookupFrankElement = useCallback(
    (subtype: string) => {
      if (!elements) return
      return (Object.values(elements as Record<string, ElementDetails>) as ElementDetails[]).find(
        (element) => element.name === subtype,
      )
    },
    [elements],
  )

  const deselectOtherNodes = useCallback(
    (nodeId: string) => {
      const flowNodes = reactFlow.getNodes()
      if (flowNodes.filter((flowNode) => flowNode.selected).length > 1) {
        reactFlow.setNodes(flowNodes.map((node) => ({ ...node, selected: node.id === nodeId })))
      }
    },
    [reactFlow],
  )

  const applyNodeContext = useCallback(
    (node: FrankNodeType, frankElement: ElementDetails) => {
      setParentId(null)
      setChildParentId(null)
      setNodeId(+node.id)
      setAttributes(frankElement.attributes)
      setEditingSubtype(node.data.subtype)
    },
    [setParentId, setChildParentId, setNodeId, setAttributes, setEditingSubtype],
  )

  const showContextIfSidebarOpen = useCallback(() => {
    const visible = useSidebarStore.getState().getVisibility('studio')?.[SidebarSide.RIGHT] ?? false
    if (visible) showNodeContextMenu(true)
  }, [showNodeContextMenu])

  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: FlowNode) => {
      if (event.shiftKey || event.ctrlKey || event.metaKey || isDirty) return

      if (node.type === 'stickyNote') {
        setSelectedStickyId(node.id)
        setSelectedGroupId(null)
        showNodeContextMenu(true)
        return
      }

      if (node.type === 'groupNode') {
        setSelectedGroupId(node.id)
        setSelectedStickyId(null)
        showNodeContextMenu(true)
        return
      }

      if (isFrankNode(node)) {
        const frankElement = lookupFrankElement(node.data.subtype)
        if (frankElement) {
          deselectOtherNodes(node.id)
          setSelectedStickyId(null)
          setSelectedGroupId(null)
          applyNodeContext(node, frankElement)
          showNodeContextMenu(true)
        }
      }
    },
    [
      isDirty,
      lookupFrankElement,
      deselectOtherNodes,
      applyNodeContext,
      showNodeContextMenu,
      setSelectedStickyId,
      setSelectedGroupId,
    ],
  )

  const handleNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: FlowNode) => {
      if (isDirty) return

      if (node.type === 'stickyNote') {
        setSelectedStickyId(node.id)
        showNodeContextMenu(true)
        return
      }

      if (!isFrankNode(node)) return
      const frankElement = lookupFrankElement(node.data.subtype)
      if (!frankElement) return

      setSelectedStickyId(null)
      applyNodeContext(node, frankElement)
      setIsEditing(true)
      setIsMultiSelect(false)
      showNodeContextMenu(true)
    },
    [
      isDirty,
      lookupFrankElement,
      applyNodeContext,
      setIsEditing,
      setIsMultiSelect,
      setSelectedStickyId,
      showNodeContextMenu,
    ],
  )

  const handleEdgeClick = useCallback(() => {
    setIsMultiSelect(false)
    setSelectedStickyId(null)
    setSelectedGroupId(null)
    showNodeContextMenu(false)
    setIsEditing(false)
  }, [setIsMultiSelect, setSelectedStickyId, setSelectedGroupId, showNodeContextMenu, setIsEditing])

  const handleSelectionChange = useCallback(
    ({ nodes: selectedNodes }: { nodes: FlowNode[] }) => {
      const frankNodes = selectedNodes.filter((node) => isFrankNode(node))

      if (frankNodes.length > 1) {
        const firstParent = frankNodes[0]?.parentId
        const allInSameGroup = Boolean(firstParent) && frankNodes.every((n) => n.parentId === firstParent)

        setIsMultiSelect(true)
        setSelectedStickyId(null)
        setSelectedGroupId(null)
        setIsEditing(false)
        setParentId(null)
        setChildParentId(null)

        if (allInSameGroup) {
          showNodeContextMenu(true)
        } else {
          showNodeContextMenu(false)
        }
        return
      }

      setIsMultiSelect(false)

      if (frankNodes.length === 1) {
        const frankElement = lookupFrankElement((frankNodes[0] as FrankNodeType).data.subtype)
        if (!frankElement) return
        setSelectedStickyId(null)
        setSelectedGroupId(null)
        applyNodeContext(frankNodes[0] as FrankNodeType, frankElement)
        showContextIfSidebarOpen()
      }
    },
    [
      showNodeContextMenu,
      setIsEditing,
      setIsMultiSelect,
      setSelectedStickyId,
      setSelectedGroupId,
      setParentId,
      setChildParentId,
      lookupFrankElement,
      applyNodeContext,
      showContextIfSidebarOpen,
    ],
  )

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
      selected: true,
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

      if (reactFlow.getZoom() < 0.4 && sourceNode && isFrankNode(sourceNode)) {
        if (edgeDropHandleType) {
          const existingHandle = sourceNode.data.sourceHandles.find((handle) => handle.type === edgeDropHandleType)
          if (existingHandle) {
            onConnect({
              source: sourceInfo.nodeId!,
              sourceHandle: existingHandle.index.toString(),
              target: newId.toString(),
              targetHandle: null,
            })
          } else {
            const newIndex = sourceNode.data.sourceHandles.length + 1
            flowStore.addHandle(sourceInfo.nodeId!, { type: edgeDropHandleType, index: newIndex })
            onConnect({
              source: sourceInfo.nodeId!,
              sourceHandle: newIndex.toString(),
              target: newId.toString(),
              targetHandle: null,
            })
          }
          setEdgeDropHandleType(null)
        } else {
          setPendingCompactConnection({
            connection: {
              source: sourceInfo.nodeId,
              sourceHandle: null,
              target: newId.toString(),
              targetHandle: null,
            },
            sourceNodeSubtype: sourceNode.data.subtype,
            position: reactFlow.flowToScreenPosition(position),
          })
        }

        sourceInfoReference.current = { nodeId: null, handleId: null, handleType: null }
        return
      }

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

  const addStickyNote = useCallback(
    (flowPos: { x: number; y: number }) => {
      const flowStore = useFlowStore.getState()
      const newId = flowStore.getNextNodeId()

      const deselectedNodes = flowStore.nodes.map((node) => ({
        ...node,
        selected: false,
      }))

      const stickyNote: StickyNote = {
        id: newId,
        position: { x: flowPos.x, y: flowPos.y },
        data: { content: '' },
        type: 'stickyNote',
        selected: true,
        style: {
          width: FlowConfig.STICKY_NOTE_DEFAULT_WIDTH,
          height: FlowConfig.STICKY_NOTE_DEFAULT_HEIGHT,
        },
      }

      flowStore.setNodes([...deselectedNodes, stickyNote])
      setSelectedStickyId(newId)
      showNodeContextMenu(true)
    },
    [setSelectedStickyId, showNodeContextMenu],
  )

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

  const showSelectedNodeInEditor = useCallback(() => {
    const flowStore = useFlowStore.getState()
    const selectedFrankNodes = flowStore.nodes.filter(
      (node) => node.selected && node.type === 'frankNode',
    ) as FrankNodeType[]
    if (selectedFrankNodes.length !== 1) return

    const { data: nodeData } = selectedFrankNodes[0]
    const tabData = useTabStore.getState().getTab(useTabStore.getState().activeTab)
    if (!tabData?.configurationPath) return

    openInEditorAtElement(navigate, {
      subtype: nodeData.subtype,
      name: nodeData.name,
      filepath: tabData.configurationPath,
    })
  }, [navigate])

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
    function stripMeasuredDimensions(nodes: FlowNode[]): FlowNode[] {
      return nodes.map((node) => {
        if (!('measured' in node)) return node
        const { measured: _measured, ...nodeWithoutMeasured } = node as FlowNode & { measured?: unknown }
        return nodeWithoutMeasured as FlowNode
      })
    }

    function restoreFlowFromTab(tab: TabData, options: { skipViewport: boolean; forceRemeasure: boolean }) {
      const flowStore = useFlowStore.getState()
      const flowJson = tab.flowJson

      if (flowJson) {
        let nodes = Array.isArray(flowJson.nodes) ? flowJson.nodes : []
        if (options.forceRemeasure) {
          nodes = stripMeasuredDimensions(nodes)
        }
        flowStore.setNodes(nodes)
        flowStore.setEdges(Array.isArray(flowJson.edges) ? flowJson.edges : [])

        if (!options.skipViewport) {
          const savedViewport = flowJson.viewport as { x: number; y: number; zoom: number } | undefined
          const targetViewport = savedViewport ?? { x: 0, y: 0, zoom: 1 }
          flowStore.setViewport(targetViewport)
          requestAnimationFrame(() => reactFlowRef.current?.setViewport(targetViewport))
        }

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

    function loadFromCache(
      tab: TabData,
      pendingSelection: { subtype: string; name: string } | null,
      recenter: boolean,
    ) {
      const hasPendingSelection = !!pendingSelection
      restoreFlowFromTab(tab, {
        skipViewport: hasPendingSelection || recenter,
        forceRemeasure: hasPendingSelection,
      })
      if (pendingSelection) {
        applySelectionToNodes(pendingSelection)
      } else if (recenter) {
        const cachedNodes = useFlowStore.getState().nodes
        waitForStableCanvasDimensions((canvasWidth, canvasHeight) => {
          const viewport = computeAdapterCenteredViewport(cachedNodes, canvasWidth, canvasHeight)
          useFlowStore.getState().setViewport(viewport)
          reactFlowRef.current?.setViewport(viewport)
        })
      }
    }

    async function loadFromApi(tab: TabData, pendingSelection: { subtype: string; name: string } | null) {
      const flowStore = useFlowStore.getState()
      const currentProject = useProjectStore.getState().project
      if (!currentProject) return

      const adapter = await getAdapterFromConfiguration(
        currentProject.name,
        tab.configurationPath,
        tab.name!,
        tab.adapterPosition,
      )
      if (!adapter) return
      const adapterJson = await convertAdapterXmlToJson(adapter)

      flowStore.setEdges(adapterJson.edges)
      flowStore.setNodes(adapterJson.nodes)
      flowStore.setHistory([])
      flowStore.setFuture([])
      pendingInitialRelayoutRef.current = { pendingSelection }
      setRelayoutNonce((nonce) => nonce + 1)
    }

    async function loadFlowFromTab(tab: TabData) {
      const tabId = useTabStore.getState().activeTab
      const pendingSelection = tab.pendingNodeSelection ?? null
      const recenter = tab.pendingRecenter ?? false

      if (tabId === loadedTabIdRef.current && !pendingSelection && !recenter) return
      loadedTabIdRef.current = tabId

      isLoadingTabRef.current = true
      setLoading(true)

      if (pendingSelection || recenter) {
        useTabStore.getState().setTabData(tabId, { ...tab, pendingNodeSelection: null, pendingRecenter: null })
      }

      try {
        const hasCachedFlow = tab.flowJson && Object.keys(tab.flowJson).length > 0
        if (hasCachedFlow) {
          loadFromCache(tab, pendingSelection, recenter)
        } else if (tab.configurationPath && tab.name) {
          await loadFromApi(tab, pendingSelection)
        }
      } catch (error) {
        logApiError('Error loading tab flow:', error as Error)
      } finally {
        isLoadingTabRef.current = false
        setLoading(false)
      }
    }

    function saveFlowToTab(tabId: string) {
      const tabStore = useTabStore.getState()
      const flowStore = useFlowStore.getState()

      const tabData = tabStore.getTab(tabId)
      if (!tabData) return

      tabStore.setTabData(tabId, {
        ...tabData,
        flowJson: {
          nodes: flowStore.nodes,
          edges: flowStore.edges,
          viewport: flowStore.viewport,
        },
        history: flowStore.history,
        future: flowStore.future,
      })
    }

    const tabStore = useTabStore.getState()
    const currentActiveTabKey = tabStore.activeTab

    if (currentActiveTabKey) {
      const activeTab = tabStore.getTab(currentActiveTabKey)
      if (activeTab) {
        loadFlowFromTab(activeTab)
      }
    }

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
  }, [layoutGraph, computeAdapterCenteredViewport, applySelectionToNodes, waitForStableCanvasDimensions])

  useEffect(() => {
    const unsub = useFlowStore.subscribe(
      (state) => state.nodes,
      (nodes) => {
        const { selectedStickyId, setSelectedStickyId, selectedGroupId, setSelectedGroupId, setIsEditing } =
          useNodeContextStore.getState()

        if (selectedStickyId && !nodes.some((node) => node.id === selectedStickyId)) {
          setSelectedStickyId(null)
          showNodeContextMenu(false)
          setIsEditing(false)
        }

        if (selectedGroupId && !nodes.some((node) => node.id === selectedGroupId)) {
          setSelectedGroupId(null)
          showNodeContextMenu(false)
        }
      },
    )
    return () => unsub()
  }, [showNodeContextMenu])

  useEffect(() => {
    const unsub = useFlowStore.subscribe(
      (state) => state.nodes, // selector: subscribe only to nodes
      (newNodes, oldNodes) => {
        if (!reactFlowRef.current || !oldNodes) return

        // Compare old vs new node data
        for (const newNode of newNodes) {
          const oldNode = oldNodes.find((oldNode) => oldNode.id === newNode.id)
          if (!oldNode) continue

          if (!isStickyNote(newNode) && oldNode.data !== newNode.data) {
            updateNodeInternals(newNode.id)
          }
        }
      },
    )

    return () => unsub()
  }, [updateNodeInternals])

  return (
    <div
      className="flex h-full w-full flex-col"
      id="flow-canvas"
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onContextMenu={handleRightMouseButtonClick}
    >
      <div className="border-b-border bg-background flex h-10 shrink-0 items-center justify-between border-b px-3">
        <SaveStatusIndicator />
        <Button onClick={onOpenInEditor} className="flex items-center gap-1.5 text-xs" title="Open in Editor">
          <CodeIcon className="h-3.5 w-3.5 fill-current" />
          Open in Editor
        </Button>
      </div>

      <div ref={canvasRef} className="relative flex-1 overflow-hidden">
        {loading && (
          <div className="bg-opacity-80 bg-background absolute inset-0 z-50 flex items-center justify-center">
            <div className="border-border h-10 w-10 animate-spin rounded-full border-t-2 border-b-2"></div>
          </div>
        )}

        {isEditing && !pendingCompactConnection && (
          <div className={`absolute inset-0 z-10 ${isDirty ? 'bg-background/10' : 'pointer-events-none'}`}>
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded bg-black/30 px-3 py-2 text-xs text-white backdrop-blur-[0.5px]">
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
          nodes={nodes}
          edges={edges}
          onViewportChange={(viewPort) => {
            useFlowStore.getState().setViewport(viewPort)
          }}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={handleConnect}
          onReconnect={onReconnect}
          onNodeClick={handleNodeClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          onNodeDragStop={handleNodeDragStop}
          onEdgeClick={handleEdgeClick}
          onSelectionChange={handleSelectionChange}
          onConnectStart={handleConnectStart}
          onConnectEnd={handleConnectEnd}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onPaneClick={() => {
            setContextMenu(null)
            setSelectedStickyId(null)
            setSelectedGroupId(null)
            if (!isDirty) {
              showNodeContextMenu(false)
              setIsEditing(false)
              setParentId(null)
              setChildParentId(null)
            }
          }}
          deleteKeyCode={null}
          minZoom={0.2}
        >
          <Controls position="top-left">
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

        <CreateNodeModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          addNodeAtPosition={addNodeAtPosition}
          positions={edgeDropPositions}
          sourceInfo={sourceInfoReference.current}
        />

        {pendingCompactConnection && (
          <HandleMenu
            title="Select Handle Type"
            position={pendingCompactConnection.position}
            onClose={() => setPendingCompactConnection(null)}
            onSelect={handleCompactHandleSelect}
            typesAllowed={
              (elements as Record<string, ElementDetails> | null)?.[pendingCompactConnection.sourceNodeSubtype]
                ?.forwards
            }
          />
        )}

        {pendingEdgeDrop && (
          <HandleMenu
            title="Select Handle Type"
            position={pendingEdgeDrop.position}
            onClose={() => setPendingEdgeDrop(null)}
            onSelect={handleEdgeDropHandleSelect}
            typesAllowed={
              (elements as Record<string, ElementDetails> | null)?.[pendingEdgeDrop.sourceNodeSubtype]?.forwards
            }
          />
        )}

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
            onShowInEditor={showSelectedNodeInEditor}
            hasSelection={nodes.some((node) => node.selected)}
            hasGroupedSelection={
              nodes.some((node) => node.selected) && allSelectedInSameGroup(nodes.filter((node) => node.selected))
            }
            hasClipboard={clipboardRef.current !== null}
            hasSingleNodeSelection={nodes.filter((node) => node.selected && node.type === 'frankNode').length === 1}
          />
        )}
      </div>
    </div>
  )
}

export default function Flow({
  showNodeContextMenu,
  onOpenInEditor,
}: Readonly<{ showNodeContextMenu: (b: boolean) => void; onOpenInEditor: () => void }>) {
  return (
    <NodeContextMenuContext.Provider value={showNodeContextMenu}>
      <ReactFlowProvider>
        <FlowCanvas onOpenInEditor={onOpenInEditor} />
      </ReactFlowProvider>
    </NodeContextMenuContext.Provider>
  )
}
