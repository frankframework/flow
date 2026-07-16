import {
  addEdge,
  Background,
  BackgroundVariant,
  type Connection,
  ControlButton,
  Controls,
  type Edge,
  type FinalConnectionState,
  type InternalNode,
  type Node,
  type OnConnectStartParams,
  ReactFlow,
  useNodesInitialized,
  useReactFlow,
  useUpdateNodeInternals,
} from '@xyflow/react'
import Dagre from '@dagrejs/dagre'
import { useNavigate } from 'react-router'
import { SaveStatusIndicator } from '~/components/save-status-indicator'
import { convertAdapterXmlToJson, getAdapterFromConfiguration } from '~/routes/studio/xml-to-json-parser'
import { useSaveStatusStore } from '~/stores/save-status-store'
import CodeIcon from '/icons/solar/Code.svg?react'
import '@xyflow/react/dist/style.css'
import FrankNodeComponent, { type FrankNodeType } from '~/routes/studio/canvas-flow/nodetypes/frank-node'
import FrankEdgeComponent from '~/routes/studio/canvas-flow/edgetypes/frank-edge'
import ExitNodeComponent, { type ExitNode } from '~/routes/studio/canvas-flow/nodetypes/exit-node'
import GroupNodeComponent, { type GroupNode } from '~/routes/studio/canvas-flow/nodetypes/group-node'
import useFlowStore, { isStickyNote } from '~/stores/flow-store'
import { useShallow } from 'zustand/react/shallow'
import { FlowConfig } from '~/routes/studio/canvas-flow/flow.config'
import { getElementTypeFromName } from '~/routes/studio/node-translator-module'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { logApiError } from '~/utils/logger'
import { useNodeContextMenu } from './node-context-menu-context'
import StickyNoteComponent, { type StickyNote } from '~/routes/studio/canvas-flow/nodetypes/sticky-note'
import useTabStore, { type TabData } from '~/stores/tab-store'
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
import { showErrorToast, showWarningToast } from '~/components/toast'
import { useSettingsStore } from '~/stores/settings-store'
import { useShortcut } from '~/hooks/use-shortcut'
import LightbulbIcon from '/icons/solar/Lightbulb.svg?react'
import CanvasContextMenu from '~/components/flow/canvas-context-menu'
import { SidebarSide, useSidebarStore } from '~/components/sidebars-layout/sidebar-layout-store'
import { openInEditorAtElement } from '~/actions/navigationActions'
import HandleMenu from '~/routes/studio/canvas-flow/nodetypes/components/handle-menu'
import IconLabelButton from '~/components/inputs/icon-label-button'

export type FlowNode = FrankNodeType | ExitNode | StickyNote | GroupNode | Node

const STICKY_SNAP_DISTANCE = 60
const nodeTypes = {
  frankNode: FrankNodeComponent,
  exitNode: ExitNodeComponent,
  stickyNote: StickyNoteComponent,
  groupNode: GroupNodeComponent,
}
const edgeTypes = { frankEdge: FrankEdgeComponent }

function getStickyCenter(sticky: StickyNote): { x: number; y: number } {
  return {
    x: sticky.position.x + (sticky.measured?.width ?? FlowConfig.STICKY_NOTE_DEFAULT_WIDTH) / 2,
    y: sticky.position.y + (sticky.measured?.height ?? FlowConfig.STICKY_NOTE_DEFAULT_HEIGHT) / 2,
  }
}

function isWithinSnapDistance(sticky: StickyNote, frankNode: FlowNode): boolean {
  const center = getStickyCenter(sticky)
  return (
    center.x >= frankNode.position.x - STICKY_SNAP_DISTANCE &&
    center.x <=
      frankNode.position.x + (frankNode.measured?.width ?? FlowConfig.NODE_DEFAULT_WIDTH) + STICKY_SNAP_DISTANCE &&
    center.y >= frankNode.position.y - STICKY_SNAP_DISTANCE &&
    center.y <= frankNode.position.y + (frankNode.measured?.height ?? FlowConfig.NODE_MIN_HEIGHT) + STICKY_SNAP_DISTANCE
  )
}

function distanceToFrankNode(sticky: StickyNote, frankNode: FlowNode): number {
  const center = getStickyCenter(sticky)
  const dx = center.x - (frankNode.position.x + (frankNode.measured?.width ?? FlowConfig.NODE_DEFAULT_WIDTH) / 2)
  const dy = center.y - (frankNode.position.y + (frankNode.measured?.height ?? FlowConfig.NODE_MIN_HEIGHT) / 2)
  return Math.hypot(dx, dy)
}

function isFrankNode(node: FlowNode): node is FrankNodeType {
  return node.type === 'frankNode' || node.type === 'exitNode'
}

function findNearestFrankNode(sticky: StickyNote, candidates: FlowNode[]): FlowNode | null {
  return candidates
    .filter((node) => (node.type === 'frankNode' || node.type === 'exitNode') && isWithinSnapDistance(sticky, node))
    .reduce<FlowNode | null>((best, node) => {
      if (best === null) return node
      return distanceToFrankNode(sticky, node) < distanceToFrankNode(sticky, best) ? node : best
    }, null)
}

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

function stripMeasuredDimensions(nodes: FlowNode[]): FlowNode[] {
  return nodes.map((node) => {
    if (!('measured' in node)) return node
    const { measured: _measured, ...nodeWithoutMeasured } = node as FlowNode & { measured?: unknown }
    return nodeWithoutMeasured as FlowNode
  })
}

export default function FlowCanvas({ onOpenInEditor }: { onOpenInEditor: () => void }) {
  /* Hooks */

  const showNodeContextMenu = useNodeContextMenu()
  const navigate = useNavigate()
  const { elements } = useFFDoc()
  const updateNodeInternals = useUpdateNodeInternals()
  const reactFlow = useReactFlow()
  const nodesInitialized = useNodesInitialized()
  useShortcut({
    'studio.copy': () => copySelection(),
    'studio.paste': () => pasteSelection(),
    'studio.cut': () => cutSelection(),
    'studio.undo': () => undo(),
    'studio.redo': () => redo(),
    'studio.redo-alt': () => redo(),
    'studio.group': () => handleGrouping(),
    'studio.ungroup': () => handleUngroup(),
    'studio.hide': () => toggleSelectedHidden(),
    'studio.save': () => void saveFlow(),
    'studio.close-context': () => closeEditNodeContextOnEscape(),
    'studio.delete': () => deleteSelection(),
    'studio.show-in-editor': () => showSelectedNodeInEditor(),
  })

  /* useState */

  const [loading, setLoading] = useState(false)
  const [showCreateNodeModal, setShowCreateNodeModal] = useState(false)
  const [edgeDropPositions, setEdgeDropPositions] = useState<{ x: number; y: number } | null>(null)
  const [edgeDropHandleType, setEdgeDropHandleType] = useState<string | null>(null)
  const [pendingCompactConnection, setPendingCompactConnection] = useState<{
    connection: Connection
    sourceNodeSubtype: string
    position: { x: number; y: number }
  } | null>(null)
  const [pendingEdgeDrop, setPendingEdgeDrop] = useState<{
    position: { x: number; y: number }
    sourceNodeSubtype: string
  } | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; flowPos: { x: number; y: number } } | null>(
    null,
  )

  /* useRef */

  const showNodeContextMenuRef = useRef(showNodeContextMenu)
  const clipboardRef = useRef<{
    nodes: FlowNode[]
    edges: Edge[]
  } | null>(null)
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLoadingTabRef = useRef(false)
  const pendingFitViewRef = useRef<string | null>(null)
  const reactFlowRef = useRef(reactFlow)
  const canvasRef = useRef<HTMLDivElement>(null)
  const fitAfterLayoutRef = useRef<{ id: string }[] | null>(null)
  const pendingInitialRelayoutRef = useRef<{ pendingSelection: { subtype: string; name: string } | null } | null>(null)
  const sourceInfoReference = useRef<{
    nodeId: string | null
    handleId: string | null
    handleType: 'source' | 'target' | null
  }>({ nodeId: null, handleId: null, handleType: null })

  /* useStore */

  const { project } = useProjectStore()
  const { activeTab, getTab, setTabData } = useTabStore()
  const {
    nodes,
    edges,
    viewport,
    future,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onReconnect,
    undo,
    redo,
    nodeIdCounter,
    getNextNodeId,
    addNode,
    setNodesHiddenForwards,
    setNodesWithoutHistory,
    setViewport,
    setHistory,
    setFuture,
    setEdges,
    setNodes,
    setStickyAttachment,
    deleteChild,
    deleteNode,
    history: flowHistory,
    resetStore: resetFlowStore,
    addHandle: addFlowHandle,
  } = useFlowStore()
  const { setSaving, setSaved, setIdle } = useSaveStatusStore()
  const autosaveEnabled = useSettingsStore((state) => state.general.autoSave.enabled)
  const autosaveDelay = useSettingsStore((state) => state.general.autoSave.delayMs)
  const hoveredNodeId = useNodeContextStore((state) => state.hoveredNodeId)
  const showAllForwards = useNodeContextStore((state) => state.showAllForwards)
  const setHoveredNodeId = useNodeContextStore((state) => state.setHoveredNodeId)
  const toggleShowAllForwards = useNodeContextStore((state) => state.toggleShowAllForwards)
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

  /* useMemo */

  const hiddenForwardNodeIds = useMemo(() => {
    const ids = new Set<string>()
    for (const node of nodes) {
      if (isFrankNode(node) && node.data.hiddenForwards) ids.add(node.id)
    }

    return ids
  }, [nodes])

  const revealedHiddenIds = useMemo(() => {
    const revealed = new Set<string>()
    if (hiddenForwardNodeIds.size === 0) return revealed
    if (showAllForwards) {
      for (const id of hiddenForwardNodeIds) revealed.add(id)
      return revealed
    }

    if (hoveredNodeId !== null) {
      if (hiddenForwardNodeIds.has(hoveredNodeId)) revealed.add(hoveredNodeId)
      for (const edge of edges) {
        if (edge.source === hoveredNodeId && hiddenForwardNodeIds.has(edge.target)) revealed.add(edge.target)
      }
    }

    return revealed
  }, [edges, hiddenForwardNodeIds, hoveredNodeId, showAllForwards])

  const displayEdges = useMemo(() => {
    if (hiddenForwardNodeIds.size === 0) return edges
    const isHiddenAndNotRevealed = (nodeId: string) =>
      hiddenForwardNodeIds.has(nodeId) && !revealedHiddenIds.has(nodeId)

    return edges.map((edge) => {
      const faded = isHiddenAndNotRevealed(edge.source) || isHiddenAndNotRevealed(edge.target)
      return faded ? { ...edge, data: { ...edge.data, faded: true } } : edge
    })
  }, [edges, hiddenForwardNodeIds, revealedHiddenIds])

  const displayNodes = useMemo(() => {
    if (hiddenForwardNodeIds.size === 0) return nodes

    return nodes.map((node) => {
      if (!hiddenForwardNodeIds.has(node.id)) return node
      const opacity = revealedHiddenIds.has(node.id) ? 1 : 0.5
      return { ...node, style: { ...node.style, opacity, transition: 'opacity 150ms cubic-bezier(0.4, 0, 0.2, 1)' } }
    })
  }, [nodes, hiddenForwardNodeIds, revealedHiddenIds])

  /* useCallback */

  const saveFlowToTab = useCallback(
    (tabId: string) => {
      const tabData = getTab(tabId)
      if (!tabData) return

      setTabData(tabId, {
        ...tabData,
        flowJson: {
          nodes,
          edges,
          viewport,
        },
        history: flowHistory,
        future,
      })
    },
    [edges, flowHistory, future, getTab, nodes, setTabData, viewport],
  )

  const loadFromApi = useCallback(
    async (tab: TabData, pendingSelection: { subtype: string; name: string } | null) => {
      if (!project) return

      const adapter = await getAdapterFromConfiguration(
        project.name,
        tab.configurationPath,
        tab.name!,
        tab.adapterPosition,
      )
      if (!adapter) return

      const adapterJson = await convertAdapterXmlToJson(adapter)
      setEdges(adapterJson.edges)
      setNodes(adapterJson.nodes)
      setHistory([])
      setFuture([])
      pendingInitialRelayoutRef.current = { pendingSelection }
    },
    [project, setEdges, setFuture, setHistory, setNodes],
  )

  const applySelectionToNodes = useCallback(
    (pendingSelection: { subtype: string; name: string }) => {
      const currentNodes = nodes
      const nodeToSelect = currentNodes.find(
        (node): node is FrankNodeType =>
          isFrankNode(node) &&
          node.data.subtype === pendingSelection.subtype &&
          node.data.name === pendingSelection.name,
      )

      if (!nodeToSelect) return

      setNodes(
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
      nodeContextStore.setAttributes(elements?.[nodeToSelect.data.subtype]?.attributes)
      nodeContextStore.setEditingSubtype(nodeToSelect.data.subtype)
      nodeContextStore.setIsEditing(true)
      showNodeContextMenuRef.current(true)
    },
    [elements, nodes, setNodes],
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
    }

    requestAnimationFrame(checkDimensions)
  }, [])

  const restoreFlowFromTab = useCallback(
    (tab: TabData, options: { skipViewport: boolean; forceRemeasure: boolean }) => {
      const flowJson = tab.flowJson

      if (flowJson) {
        let nodes = Array.isArray(flowJson.nodes) ? flowJson.nodes : []
        if (options.forceRemeasure) {
          nodes = stripMeasuredDimensions(nodes)
        }
        setNodes(nodes)
        setEdges(Array.isArray(flowJson.edges) ? flowJson.edges : [])

        if (!options.skipViewport) {
          const savedViewport = flowJson.viewport as { x: number; y: number; zoom: number } | undefined
          const targetViewport = savedViewport ?? { x: 0, y: 0, zoom: 1 }
          setViewport(targetViewport)
          requestAnimationFrame(() => reactFlowRef.current?.setViewport(targetViewport))
        }

        setHistory(tab.history ?? [])
        setFuture(tab.future ?? [])
      } else {
        resetFlowStore()
      }
    },
    [resetFlowStore, setEdges, setFuture, setHistory, setNodes, setViewport],
  )

  const loadFromCache = useCallback(
    (tab: TabData, pendingSelection: { subtype: string; name: string } | null, recenter: boolean) => {
      const hasPendingSelection = !!pendingSelection
      restoreFlowFromTab(tab, {
        skipViewport: hasPendingSelection || recenter,
        forceRemeasure: hasPendingSelection,
      })
      if (pendingSelection) {
        applySelectionToNodes(pendingSelection)
      } else if (recenter) {
        const cachedNodes = [...nodes]
        waitForStableCanvasDimensions((canvasWidth, canvasHeight) => {
          const viewport = computeAdapterCenteredViewport(cachedNodes, canvasWidth, canvasHeight)
          setViewport(viewport)
          reactFlowRef.current?.setViewport(viewport)
        })
      }
    },
    [
      applySelectionToNodes,
      computeAdapterCenteredViewport,
      nodes,
      restoreFlowFromTab,
      setViewport,
      waitForStableCanvasDimensions,
    ],
  )

  const loadFlowFromTab = useCallback(
    async (tabData: TabData) => {
      const pendingSelection = tabData.pendingNodeSelection ?? null
      const recenter = tabData.pendingRecenter ?? false

      isLoadingTabRef.current = true
      setLoading(true)

      if (pendingSelection || recenter) {
        setTabData(activeTab, { ...tabData, pendingNodeSelection: null, pendingRecenter: null })
      }

      try {
        const hasCachedFlow = tabData.flowJson && Object.keys(tabData.flowJson).length > 0
        if (hasCachedFlow) {
          loadFromCache(tabData, pendingSelection, recenter)
        } else if (tabData.configurationPath && tabData.name) {
          await loadFromApi(tabData, pendingSelection)
        }
      } catch (error) {
        logApiError('Error loading tab flow:', error as Error)
      } finally {
        isLoadingTabRef.current = false
        setLoading(false)
      }
    },
    [activeTab, loadFromApi, loadFromCache, setTabData],
  )

  const saveFlow = useCallback(async () => {
    const tabData = getTab(activeTab)
    const configurationPath = tabData?.configurationPath
    const adapterName = tabData?.name
    const currentProject = useProjectStore.getState().project
    if (!configurationPath || !adapterName || !currentProject) return

    const flowData = { nodes, edges, viewport }
    const adapterPosition = tabData?.adapterPosition

    setSaving()
    const allAdapters: Element[] = []
    const fullConfigXml = await fetchConfigurationFileCached(currentProject.name, configurationPath)
    try {
      const configDoc = new DOMParser().parseFromString(fullConfigXml, 'text/xml')
      allAdapters.push(...configDoc.querySelectorAll('Adapter, adapter'))
    } catch (error) {
      logApiError('Failed to parse configuration XML', error as Error)
    }

    const existingAdapter =
      adapterPosition === undefined
        ? (allAdapters.find((element) => element.getAttribute('name') === adapterName) ?? null)
        : (allAdapters[adapterPosition] ?? null)

    if (!existingAdapter) {
      throw new Error(`Could not find adapter "${adapterName}" at position ${adapterPosition} in configuration`)
    }

    try {
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

      if (tabData) {
        setTabData(activeTab, {
          ...tabData,
          flowJson: { nodes, edges, viewport },
        })
      }

      setSaved()
    } catch (error) {
      logApiError('Failed to save XML', error as Error)
      setIdle()
    }
  }, [activeTab, edges, getTab, nodes, setIdle, setSaved, setSaving, setTabData, viewport])

  const scheduleAutoSave = useCallback(() => {
    if (!autosaveEnabled) return
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setTimeout(() => {
      autoSaveTimerRef.current = null
      saveFlow()
    }, autosaveDelay)
  }, [saveFlow, autosaveEnabled, autosaveDelay])

  const handleConnect = useCallback(
    (connection: Connection) => {
      const zoom = reactFlow.getZoom()

      if (zoom < FlowConfig.ZOOM_THRESHOLD && connection.source) {
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
    [nodes, onConnect, reactFlow],
  )

  const handleCompactHandleSelect = useCallback(
    (type: string) => {
      if (!pendingCompactConnection) return
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
        addFlowHandle(pendingCompactConnection.connection.source, { type, index: newIndex })
        onConnect({
          ...pendingCompactConnection.connection,
          sourceHandle: newIndex.toString(),
        })
      }

      setPendingCompactConnection(null)
    },
    [pendingCompactConnection, nodes, onConnect, addFlowHandle],
  )

  const handleEdgeDropHandleSelect = useCallback(
    (type: string) => {
      if (!pendingEdgeDrop) return
      const flowPositions = reactFlow.screenToFlowPosition(pendingEdgeDrop.position)
      setEdgeDropHandleType(type)
      setEdgeDropPositions(flowPositions)
      setPendingEdgeDrop(null)
      setShowCreateNodeModal(true)
    },
    [pendingEdgeDrop, reactFlow],
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
    const resetNodes = nodes.map((node) =>
      node.type === 'frankNode' || node.type === 'exitNode' ? { ...node, position: { x: 0, y: 0 } } : node,
    )
    const laidOut = layoutGraph(resetNodes, edges, 'LR')

    const nodeIds = laidOut
      .filter((node) => node.type === 'frankNode' || node.type === 'exitNode')
      .map((node) => ({ id: node.id }))

    if (nodeIds.length === 0) return

    fitAfterLayoutRef.current = nodeIds
    setNodes(laidOut)
  }, [edges, layoutGraph, nodes, setNodes])

  const getFullySelectedGroupIds = useCallback(
    (parentIds: string[], selectedNodes: FlowNode[]) => {
      return parentIds.filter((parentId) => {
        const children = nodes.filter((node) => node.parentId === parentId)
        return children.every((child) => selectedNodes.some((selectedNode) => selectedNode.id === child.id))
      })
    },
    [nodes],
  )

  const allSelectedInSameGroup = useCallback((selectedNodes: FlowNode[]) => {
    return selectedNodes.every((node) => node.parentId && node.parentId === selectedNodes[0].parentId)
  }, [])

  const degroupNodes = useCallback((selectedNodes: FlowNode[], parentId: string, allNodes: FlowNode[]): FlowNode[] => {
    const groupNode = allNodes.find((node) => node.id === parentId)
    if (!groupNode) return allNodes

    const groupX = groupNode.position.x
    const groupY = groupNode.position.y
    const ungroupedNodes = []

    for (const node of allNodes) {
      if (node.id === parentId) continue
      if (!selectedNodes.includes(node) && node.parentId !== parentId) ungroupedNodes.push(node)

      const ungroupedNode = {
        ...node,
        position: {
          x: node.position.x + groupX,
          y: node.position.y + groupY,
        },
        parentId: undefined,
        extent: undefined,
      }
      ungroupedNodes.push(ungroupedNode)
    }
    return ungroupedNodes
  }, [])

  const handleDegroupSingleGroup = useCallback(
    (selectedNodes: FlowNode[]) => {
      const parentId = selectedNodes[0].parentId
      if (!parentId) return
      const updatedNodes = degroupNodes(selectedNodes, parentId, nodes)
      setNodes(updatedNodes)
    },
    [degroupNodes, nodes, setNodes],
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



  const groupNodes = useCallback(
    (nodesToGroup: FlowNode[], currentNodes: FlowNode[]) => {
      const minX = Math.min(...nodesToGroup.map((node) => node.position.x))
      const minY = Math.min(...nodesToGroup.map((node) => node.position.y))
      const maxX = Math.max(...nodesToGroup.map((node) => node.position.x + (node.measured?.width ?? 0)))
      const maxY = Math.max(...nodesToGroup.map((node) => node.position.y + (node.measured?.height ?? 0)))

      const padding = 30
      const width = maxX - minX + padding * 2
      const height = maxY - minY + padding * 2

      const newGroupId = getNextNodeId()

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

      setNodes(allNodes)
    },
    [getNextNodeId, setNodes],
  )

  const handleMergeUngroupedIntoGroup = useCallback(
    (selectedNodes: FlowNode[]) => {
      const parentId = selectedNodes.find((n) => n.parentId)?.parentId
      if (!parentId) return
      const updatedNodes = degroupNodes(selectedNodes, parentId, nodes)
      const updatedSelectedNodes = updatedNodes.filter((node) =>
        selectedNodes.some((selectedNode) => selectedNode.id === node.id),
      )
      groupNodes(updatedSelectedNodes, updatedNodes)
    },
    [degroupNodes, nodes, groupNodes],
  )

  const handleMultiGroupMerge = useCallback(
    (groupIds: string[], selectedNodes: FlowNode[]) => {
      let updatedNodes = [...nodes]
      for (const parentId of groupIds) {
        const groupChildren = updatedNodes.filter((node) => node.parentId === parentId)
        updatedNodes = degroupNodes(groupChildren, parentId, updatedNodes)
      }

      const degroupedSelectedNodes = updatedNodes.filter((node) =>
        selectedNodes.some((selected) => selected.id === node.id),
      )

      groupNodes(degroupedSelectedNodes, updatedNodes)
    },
    [nodes, groupNodes, degroupNodes],
  )

  const handleGrouping = useCallback(() => {
    const selectedNodes = nodes.filter((node) => node.selected)
    if (selectedNodes.length < 2) return

    const parentIds = [...new Set(selectedNodes.map((node) => node.parentId).filter(Boolean))] as string[]
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
    getFullySelectedGroupIds,
    allSelectedInSameGroup,
    shouldMergeUngroupedIntoGroup,
    groupNodes,
    showNodeContextMenu,
    handleMultiGroupMerge,
    handleMergeUngroupedIntoGroup,
  ])

  const copySelection = useCallback(() => {
    const selectedNodes = nodes.filter((node) => node.selected)
    if (selectedNodes.length === 0) return

    const selectedNodeIds = new Set(selectedNodes.map((node) => node.id))
    const selectedEdges = edges.filter((edge) => selectedNodeIds.has(edge.source) && selectedNodeIds.has(edge.target))

    const data = { nodes: selectedNodes, edges: selectedEdges }
    clipboardRef.current = data

    navigator.clipboard
      .writeText(JSON.stringify(data))
      .catch(() => showWarningToast('Copy/paste may not work in this browser.', 'Failed to copy'))
  }, [nodes, edges])

  const applyClipboardData = useCallback(
    (clipboard: { nodes: FlowNode[]; edges: Edge[] }) => {
      const idMap = new Map<string, string>()
      const generateId = () => getNextNodeId().toString()

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

      const deselectedNodes = nodes.map((node) => ({ ...node, selected: false }))
      const deselectedEdges = edges.map((edge) => ({ ...edge, selected: false }))

      setNodes([...deselectedNodes, ...newNodes])
      setEdges([...deselectedEdges, ...newEdges])
    },
    [edges, getNextNodeId, nodes, setEdges, setNodes],
  )

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

  const deleteSelection = useCallback((): boolean => {
    if (isEditing) return false

    const { parentId: storeParentId, nodeId: storeNodeId } = useNodeContextStore.getState()
    if (storeParentId !== null) {
      deleteChild(storeParentId, storeNodeId.toString())
      useNodeContextStore.getState().setParentId(null)
      useNodeContextStore.getState().setChildParentId(null)
      useNodeContextStore.getState().setNodeId(0)
      showNodeContextMenu(false)
      return true
    }

    const selectedNodeIds = new Set(nodes.filter((node) => node.selected).map((n) => n.id))
    const hasSelection = selectedNodeIds.size > 0 || edges.some((e) => e.selected)
    if (!hasSelection) return false

    const { selectedStickyId } = useNodeContextStore.getState()
    if (selectedStickyId && selectedNodeIds.has(selectedStickyId)) {
      useNodeContextStore.getState().setSelectedStickyId(null)
      showNodeContextMenu(false)
    }

    setNodes(nodes.filter((node) => !node.selected))
    setEdges(
      edges.filter((edge) => !edge.selected && !selectedNodeIds.has(edge.source) && !selectedNodeIds.has(edge.target)),
    )
    return true
  }, [deleteChild, edges, isEditing, nodes, setEdges, setNodes, showNodeContextMenu])

  const toggleSelectedHidden = useCallback(() => {
    const selected = useFlowStore
      .getState()
      .nodes.filter((node): node is FrankNodeType => Boolean(node.selected) && isFrankNode(node))
    if (selected.length === 0) return false

    const shouldHide = selected.some((node) => !node.data.hiddenForwards)
    setNodesHiddenForwards(
      selected.map((node) => node.id),
      shouldHide,
    )
  }, [setNodesHiddenForwards])

  const handleNodeDragStop = useCallback(
    (_event: MouseEvent | TouchEvent, node: FlowNode) => {
      if (!isStickyNote(node)) return
      const nearest = findNearestFrankNode(node as StickyNote, nodes)
      if (!nearest) return

      setStickyAttachment(node.id, nearest.id)
      void useNodeContextStore.getState().saveFlow?.()
    },
    [nodes, setStickyAttachment],
  )

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

  const handleNodeMouseEnter = useCallback(
    (_event: React.MouseEvent, node: FlowNode) => {
      setHoveredNodeId(node.id)
    },
    [setHoveredNodeId],
  )

  const handleNodeMouseLeave = useCallback(() => {
    setHoveredNodeId(null)
  }, [setHoveredNodeId])

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

  const onDragOver = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      event.dataTransfer.dropEffect = allowedOnCanvas ? 'move' : 'none'
    },
    [allowedOnCanvas],
  )

  const addStickyNote = useCallback(
    (flowPos: { x: number; y: number }) => {
      const newId = getNextNodeId()

      const deselectedNodes = nodes.map((node) => ({
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

      setNodes([...deselectedNodes, stickyNote])
      setSelectedStickyId(newId)
      showNodeContextMenu(true)
    },
    [getNextNodeId, nodes, setNodes, setSelectedStickyId, showNodeContextMenu],
  )

  const cutSelection = useCallback(() => {
    copySelection()
    const selectedNodes = nodes.filter((node) => node.selected)
    if (selectedNodes.length === 0) return

    const selectedNodeIds = new Set(selectedNodes.map((node) => node.id))
    const remainingNodes = nodes.filter((node) => !selectedNodeIds.has(node.id))
    const remainingEdges = edges.filter(
      (edge) => !selectedNodeIds.has(edge.source) && !selectedNodeIds.has(edge.target),
    )
    setNodes(remainingNodes)
    setEdges(remainingEdges)
  }, [copySelection, edges, nodes, setEdges, setNodes])

  const handleUngroup = useCallback(() => {
    const selectedNodes = nodes.filter((node) => node.selected)

    if (selectedNodes.length === 0) return
    const selectedGroupNodes = selectedNodes.filter((node) => node.type === 'groupNode')

    if (selectedGroupNodes.length > 0) {
      let updatedNodes = [...nodes]
      for (const groupNode of selectedGroupNodes) {
        const groupId = groupNode.id

        const children = updatedNodes.filter((n) => n.parentId === groupId)

        updatedNodes = degroupNodes(children, groupId, updatedNodes)
      }
      setNodes(updatedNodes)
      return
    }

    if (!allSelectedInSameGroup(selectedNodes)) return

    handleDegroupSingleGroup(selectedNodes)
  }, [nodes, allSelectedInSameGroup, handleDegroupSingleGroup, setNodes, degroupNodes])

  const showSelectedNodeInEditor = useCallback(() => {
    const selectedFrankNodes = nodes.filter((node) => node.selected && node.type === 'frankNode') as FrankNodeType[]
    if (selectedFrankNodes.length !== 1) return

    const { data: nodeData } = selectedFrankNodes[0]
    const tabData = useTabStore.getState().getTab(useTabStore.getState().activeTab)
    if (!tabData?.configurationPath) return

    openInEditorAtElement(navigate, {
      subtype: nodeData.subtype,
      name: nodeData.name,
      filepath: tabData.configurationPath,
    })
  }, [navigate, nodes])

  const handleRightMouseButtonClick = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      const { screenToFlowPosition } = reactFlow
      const flowPos = screenToFlowPosition({ x: event.clientX, y: event.clientY })
      setContextMenu({ x: event.clientX, y: event.clientY, flowPos })
    },
    [reactFlow],
  )

  const connectEdgeToSource = useCallback(
    ({
      sourceNode,
      sourceNodeId,
      newId,
      position,
    }: {
      sourceNode: FrankNodeType
      sourceNodeId: string
      newId: string
      position: { x: number; y: number }
    }) => {
      if (edgeDropHandleType) {
        const existingHandle = sourceNode.data.sourceHandles.find((handle) => handle.type === edgeDropHandleType)
        if (existingHandle) {
          onConnect({
            source: sourceNodeId,
            sourceHandle: existingHandle.index.toString(),
            target: newId.toString(),
            targetHandle: null,
          })
        } else {
          const newIndex = sourceNode.data.sourceHandles.length + 1
          addFlowHandle(sourceNodeId, { type: edgeDropHandleType, index: newIndex })
          onConnect({
            source: sourceNodeId,
            sourceHandle: newIndex.toString(),
            target: newId.toString(),
            targetHandle: null,
          })
        }
        setEdgeDropHandleType(null)
      } else {
        setPendingCompactConnection({
          connection: {
            source: sourceNodeId,
            sourceHandle: null,
            target: newId.toString(),
            targetHandle: null,
          },
          sourceNodeSubtype: sourceNode.data.subtype,
          position: reactFlow.flowToScreenPosition(position),
        })
      }
    },
    [addFlowHandle, edgeDropHandleType, onConnect, reactFlow],
  )

  /* useEffect */

  useEffect(() => {
    if (!activeTab) return
    const tabData = getTab(activeTab)
    if (!tabData) return

    const unsubscribe = useTabStore.subscribe(
      (state) => state.activeTab,
      async (newTab, oldTab) => {
        if (!newTab) {
          resetFlowStore()
          return
        }
        if (oldTab) saveFlowToTab(oldTab)
        const activeTab = getTab(newTab)
        if (activeTab) await loadFlowFromTab(activeTab)
      },
    )

    return () => unsubscribe()
  }, [activeTab, getTab, loadFlowFromTab, resetFlowStore, saveFlowToTab])

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

      const node = nodes.find((node) => node.id === nodeId)
      if (!node?.measured?.width || !node?.measured?.height) return

      const { absoluteX, absoluteY } = computeAbsoluteNodePosition(node, nodes)

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

  useEffect(() => {
    if (!nodesInitialized || !pendingInitialRelayoutRef.current) return

    const { pendingSelection } = pendingInitialRelayoutRef.current
    pendingInitialRelayoutRef.current = null

    const nodesWithResetPositions = nodes.map((node) =>
      node.type === 'frankNode' || node.type === 'exitNode' ? { ...node, position: { x: 0, y: 0 } } : node,
    )
    const laidOutNodes = layoutGraph(nodesWithResetPositions, edges, 'LR')
    setNodesWithoutHistory(laidOutNodes)

    if (pendingSelection) {
      applySelectionToNodes(pendingSelection)
    } else {
      waitForStableCanvasDimensions((canvasWidth, canvasHeight) => {
        const freshViewport = computeAdapterCenteredViewport(laidOutNodes, canvasWidth, canvasHeight)
        setViewport(freshViewport)
        reactFlowRef.current?.setViewport(freshViewport)
      })
    }

    setHistory([])
    setFuture([])
  }, [
    nodesInitialized,
    layoutGraph,
    waitForStableCanvasDimensions,
    computeAdapterCenteredViewport,
    applySelectionToNodes,
    nodes,
    edges,
    setNodesWithoutHistory,
    setHistory,
    setFuture,
    setViewport,
  ])

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

  /* TODO ????? */
  /*
   * useEffect(() => {
   *   showNodeContextMenuRef.current = showNodeContextMenu
   * }, [showNodeContextMenu])
   * reactFlowRef.current = reactFlow
   */

  /* Functions */

  function handleConnectStart(_: MouseEvent | TouchEvent, params: OnConnectStartParams): void {
    sourceInfoReference.current = {
      nodeId: params.nodeId,
      handleId: params.handleId,
      handleType: params.handleType,
    }
  }

  function handleConnectEnd(event: MouseEvent | TouchEvent, connectionState: FinalConnectionState<InternalNode>): void {
    const mouseEvent = event as MouseEvent
    if (!connectionState.isValid) {
      const zoom = reactFlow.getZoom()
      if (zoom < FlowConfig.ZOOM_THRESHOLD && sourceInfoReference.current.handleType === 'source') {
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

  function handleEdgeDropOnCanvas(x: number, y: number): void {
    const { screenToFlowPosition } = reactFlow
    const flowPositions = screenToFlowPosition({ x: x, y: y })

    setEdgeDropPositions(flowPositions)
    setShowCreateNodeModal(true)
  }

  function closeEditNodeContextOnEscape(): void {
    const { isNewNode, nodeId, parentId } = useNodeContextStore.getState()

    if (isNewNode) {
      if (parentId) {
        deleteChild(parentId, nodeId.toString())
      } else {
        deleteNode(nodeId.toString())
      }
      useNodeContextStore.getState().setIsNewNode(false)
    }

    showNodeContextMenu(false)
    setIsEditing(false)
    setIsMultiSelect(false)
    setParentId(null)
    setChildParentId(null)
  }

  function onDrop(event: React.DragEvent) {
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
        setNodeId(+nodeIdCounter)
      }
    }

    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })
    addNodeAtPosition(position, parsedData.name)
  }

  function onDragEnd() {
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

    const newId = getNextNodeId()
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
      data: {
        subtype: elementName,
        type: elementType,
        name: ``,
        sourceHandles: [{ type: 'success', index: 1 }],
        children: [],
      },
      type: nodeType,
    }

    addNode(newNode)

    if (sourceInfo?.nodeId && sourceInfo.handleType === 'source') {
      const sourceNode = nodes.find((node) => node.id === sourceInfo.nodeId)

      if (sourceNode && isFrankNode(sourceNode) && reactFlow.getZoom() < FlowConfig.ZOOM_THRESHOLD) {
        connectEdgeToSource({ sourceNode, sourceNodeId: sourceInfo.nodeId, newId, position })

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

      setEdges(addEdge(newEdge, edges))
      sourceInfoReference.current = { nodeId: null, handleId: null, handleType: null }
    }
  }

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
        <IconLabelButton
          label="Open in Editor"
          icon={<CodeIcon className="h-3.5 w-3.5 fill-current" />}
          onClick={onOpenInEditor}
          className="flex items-center gap-1.5 text-xs"
        />
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
          nodes={displayNodes}
          edges={displayEdges}
          onViewportChange={(viewPort) => {
            setViewport(viewPort)
          }}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={handleConnect}
          onReconnect={onReconnect}
          onNodeClick={handleNodeClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          onNodeMouseEnter={handleNodeMouseEnter}
          onNodeMouseLeave={handleNodeMouseLeave}
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
          nodeDragThreshold={4}
          nodeClickDistance={4}
        >
          <Controls position="top-left">
            {hiddenForwardNodeIds.size > 0 && (
              <ControlButton
                onClick={toggleShowAllForwards}
                title={showAllForwards ? 'Hide forwards again' : 'Temporarily show all forwards'}
              >
                <LightbulbIcon
                  className={showAllForwards ? 'fill-brand' : 'fill-foreground-muted'}
                  style={{ width: '100%', height: '100%' }}
                />
              </ControlButton>
            )}
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

        {showCreateNodeModal && (
          <CreateNodeModal
            onClose={() => setShowCreateNodeModal(false)}
            addNodeAtPosition={addNodeAtPosition}
            positions={edgeDropPositions}
            sourceInfo={sourceInfoReference.current}
          />
        )}

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
