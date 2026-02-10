import { type Dispatch, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  type Edge,
  type Node,
  type NodeTypes,
  type NodeChange,
  type EdgeChange,
  type Connection,
  useReactFlow,
} from '@xyflow/react'

import '@xyflow/react/dist/style.css'
import AddFieldForm from '~/components/datamapper/forms/add-field-form'
import AddMappingForm from '~/components/datamapper/forms/add-mapping-form'
import Modal from '~/components/datamapper/modal'
import { getNodeTypes } from '~/components/datamapper/react-flow/node-types'
import { showErrorToast, showSuccessToast } from '~/components/datamapper/toast'
import { useFlowManagement, DuplicateLabelException } from '~/hooks/use-datamapper-flow-management'
import type { ConfigActions } from '~/stores/datamapper_state/mappingListConfig/reducer'
import { useFile } from '~/stores/datamapper_state/schemaQueue/schema-queue-context'
import type { MappingListConfig } from '~/types/datamapper_types/config-types'
import type { CustomNodeData, MappingConfig, NodeLabels } from '~/types/datamapper_types/node-types'
import { TABLE_WIDTH } from '~/utils/datamapper_utils/const'
import { getNodesByTypeAndId, createMappingNode } from '~/utils/datamapper_utils/react-node-utils'
import Button from '~/components/inputs/button'

interface PropertyListProperties {
  config: MappingListConfig
  configDispatch: Dispatch<ConfigActions>
}
const INITIAL_NODES: Node[] = [
  {
    id: 'source-table',
    type: 'group',
    position: { x: 200, y: 0 },
    width: TABLE_WIDTH,

    data: {},
  },
  {
    id: 'mapping-table',
    type: 'group',
    position: { x: 800, y: 0 },
    width: TABLE_WIDTH,
    style: { display: 'none' },
    data: {},
  },
  {
    id: 'target-table',
    type: 'group',
    position: { x: 1000, y: 0 },
    width: TABLE_WIDTH,

    data: {},
  },
]
const INITIAL_EDGES: Edge[] = []

function PropertyList({ config, configDispatch }: PropertyListProperties) {
  const reactFlowInstance = useReactFlow()

  const initHasRun = useRef(false)

  const [scnodes, setScNodes] = useState<Node[]>(INITIAL_NODES)
  const [edges, setEdges] = useState<Edge[]>(INITIAL_EDGES)
  const [canvasSize, setCanvasSize] = useState({ height: 200 })
  const [addFieldModalOpen, setAddFieldModalOpen] = useState(false)
  const [addMappingModal, setAddMappingModalOpen] = useState(false)

  const [editingNode, setEditingNode] = useState<CustomNodeData | null>(null)
  const [editingMapping, setEditingMapping] = useState<MappingConfig | null>(null)

  const openModelType = useRef<'source' | 'target'>('source')

  const openModelGroups = useRef<NodeLabels[]>([])
  const [mappingSources, setMappingSources] = useState<NodeLabels[]>([])
  const [mappingTargets, setMappingTargets] = useState<NodeLabels[]>([])
  const widthRef = useRef<HTMLDivElement>(null)

  const flow = useFlowManagement({
    reactFlowInstance,
    config,
    setScNodes,
    setEdges,
  })
  const { sourceSchematics, targetSchematic, clearFiles } = useFile()

  const nodeTypes: NodeTypes = useMemo(() => {
    return getNodeTypes({
      flow,
      setScNodes,
      setEditingNode,
      setAddFieldModalOpen,
      openModelType,
      setEditingMapping,
      openMapping,
    })
  }, []) //UseMemo is used here to ensure nodetype is not changed throughout rerenders. If the variable is update reactflow throws a warning in the console;

  useEffect(() => {
    if (!reactFlowInstance) return

    const updateSize = () => {
      requestAnimationFrame(() => {
        flow.calculateTablePositions(widthRef.current?.offsetWidth ?? 0)
      })
    }

    window.addEventListener('resize', updateSize)

    // delay initial run
    requestAnimationFrame(updateSize)

    return () => {
      window.removeEventListener('resize', updateSize)
    }
  }, [reactFlowInstance])

  useEffect(() => {
    if (!reactFlowInstance) return

    configDispatch({
      type: 'SET_PROPERTY_DATA',
      payload: reactFlowInstance.toObject(),
    })
  }, [scnodes, edges])

  //Updates the outer canvas whenever something is added
  useEffect(() => {
    setCanvasSize((size) => flow.updateCanvasSize(scnodes, size))
  }, [scnodes])

  useEffect(() => {
    if (!reactFlowInstance || initHasRun.current) return
    initHasRun.current = true

    if (config.propertyData.nodes && config.propertyData.nodes.length > 1) {
      onRestore()
    } else {
      // Dummy data creation function, to be removed later maybe a if development check here would be nice?
      // initFlowNodes(flow, config)
    }
    if (targetSchematic) {
      flow.importSchematic(targetSchematic, 'target')
    }
    if (sourceSchematics.length > 0) {
      flow.importMultipleSchematics(sourceSchematics)
    }
    clearFiles()
  }, [reactFlowInstance])

  const onscNodesChange = useCallback(
    (changes: NodeChange[]) => setScNodes((nodes) => applyNodeChanges(changes, nodes) as Node[]),
    [],
  )

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) =>
      setEdges((edges) => {
        return applyEdgeChanges(changes, edges)
      }),
    [],
  )

  const onConnect = useCallback((parameters: Connection) => {
    const connectedIds = new Set<string>()

    if (parameters?.source) connectedIds.add(parameters.source)
    if (parameters?.target) connectedIds.add(parameters.target)
    setScNodes((previous) =>
      previous.map((node) => ({
        ...node,
        data: {
          ...node.data,
          checked: connectedIds.has(node.id),
        },
      })),
    )

    openMapping()

    return
  }, [])

  const onRestore = useCallback(() => {
    const restoreFlow = async () => {
      if (config.propertyData) flow.importJsonConfiguration(JSON.stringify(config.propertyData))
    }

    restoreFlow()
  }, [setScNodes])

  function openMapping() {
    requestAnimationFrame(() => {
      const sources = getNodesByTypeAndId(reactFlowInstance.getNodes(), {
        typeIncludes: 'sourceOnly',

        includeChecked: true,
      })
      const targets = getNodesByTypeAndId(reactFlowInstance.getNodes(), {
        typeIncludes: 'targetOnly',
        includeChecked: true,
      })

      if (!editingMapping) {
        const checkedSources = sources.filter((s) => s.checked)
        const checkedTargets = targets.filter((t) => t.checked)
        if (checkedSources.length > 1 && checkedTargets.length > 1) {
          showErrorToast('Many to Many mapping not supported!')
          return
        }
      }

      setMappingSources(sources)
      setMappingTargets(targets)

      setAddMappingModalOpen(true)
    })
  }

  async function saveField(data: CustomNodeData) {
    if (!reactFlowInstance) {
      setAddFieldModalOpen(false)
      setEditingNode(null)
      return
    }

    try {
      if (editingNode) {
        flow.editNode(data)
      } else {
        await flow.addNodeSequential(
          openModelType.current as 'source' | 'target',
          data.label,
          data.variableType,
          data.defaultValue ?? null,
          data.parentId,
        )
      }
      setEditingNode(null)
      setAddFieldModalOpen(false)
      showSuccessToast('Added property succesfully!')
    } catch (error) {
      if (error instanceof DuplicateLabelException) {
        showErrorToast(error.message)
      } else {
        throw error
      }
    }
  }
  async function saveMapping(parameters: MappingConfig) {
    if (!reactFlowInstance) {
      setAddMappingModalOpen(false)

      return
    }
    const { updatedNodes, updatedEdges } = createMappingNode(parameters, scnodes, edges)

    setScNodes(updatedNodes)
    setEdges(updatedEdges)
    setEditingMapping(null)
    setAddMappingModalOpen(false)
    showSuccessToast('Added mapping succesfully!')
  }
  function openAddFieldModal(modelType: 'source' | 'target') {
    openModelGroups.current = getNodesByTypeAndId(reactFlowInstance?.getNodes(), {
      typeIncludes: modelType === 'source' ? ['labeledGroup', 'extraSourceNode'] : 'labeledGroup',
      idIncludes: modelType,
    })

    openModelType.current = modelType
    setAddFieldModalOpen(true)
  }

  return (
    <div className="w-full" ref={widthRef}>
      <div className="mt-4 h-[30px] px-4">
        <div className="absolute right-[65%] flex flex-row items-center justify-between px-45">
          <h1 className="text-l font-semibold">Source: {config.formatTypes.source?.name}</h1>
        </div>

        <div className="absolute left-[65%] flex flex-row items-center justify-between px-45">
          <h1 className="text-l font-semibold">Target: {config.formatTypes.target?.name}</h1>
        </div>
      </div>

      <div className="flex w-full justify-center overflow-auto">
        <div
          style={{ height: canvasSize.height }} //Using inline style for height because Tailwind doesn't support dynamic pixel values
          className="flex w-full flex-col items-center"
        >
          <ReactFlow
            nodeTypes={nodeTypes}
            nodes={scnodes.map((n) => ({
              ...n,
              data: {
                ...n.data,
                checked: n.data?.checked ?? false,
                setNodes: setScNodes,
              },
            }))}
            edges={edges}
            onNodesChange={onscNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodesDraggable={false}
            elementsSelectable
            panOnDrag={false}
            panOnScroll={false}
            zoomOnScroll={false}
            zoomOnPinch={false}
            zoomOnDoubleClick={false}
            preventScrolling={false}
            onMove={flow.forceViewportLocation}
            onPaneClick={flow.resetHighlight}
            snapToGrid
          />
        </div>
      </div>

      <Modal
        isOpen={addFieldModalOpen}
        onClose={() => {
          setAddFieldModalOpen(false)
          setEditingNode(null)
        }}
      >
        <AddFieldForm
          fieldType={openModelType.current}
          initialData={editingNode}
          parents={openModelGroups.current}
          formatDefinition={config.formatTypes}
          onSave={saveField}
        />
      </Modal>
      <Modal
        isOpen={addMappingModal}
        onClose={() => {
          setAddMappingModalOpen(false)
          setEditingMapping(null)
        }}
      >
        <AddMappingForm
          sources={mappingSources}
          targets={mappingTargets}
          initialData={editingMapping}
          onSave={saveMapping}
        />
      </Modal>
      {!addMappingModal && !addFieldModalOpen && (
        <div className="pointer-events-none fixed right-0 bottom-4 left-0 z-5 z-60 min-w-[300px]">
          <div className="pointer-events-auto relative flex w-full justify-between px-12">
            <Button
              className="absolute bottom-2 left-1/4 z-10 rounded rounded-2xl rounded-md border px-4 py-2"
              onClick={() => openAddFieldModal('source')}
            >
              Add Source
            </Button>
            <Button
              className="bg-foreground-active text-foreground hover:bg-hover absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-2xl border px-4 py-2"
              onClick={openMapping}
            >
              MAP
            </Button>
            <Button
              className="absolute right-1/4 bottom-2 z-10 rounded rounded-2xl rounded-md border px-4 py-2"
              onClick={() => openAddFieldModal('target')}
            >
              Add target
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default PropertyList
