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
import Modal from '~/components/modal'
import { getNodeTypes } from '~/components/datamapper/react-flow/node-types'
import { showErrorToast, showSuccessToast } from '~/components/toast'
import { useFlowManagement } from '~/hooks/use-datamapper-flow-management'
import { type ConfigActions } from '~/stores/datamapper_state/mappingListConfig/reducer'
import { useFile } from '~/stores/datamapper_state/schemaQueue/schema-queue-context'
import type { CustomNodeData, MappingNodeData, NodeLabels } from '~/types/datamapper_types/react-node-types'
import { TABLE_WIDTH } from '~/utils/datamapper_utils/constant'
import {
  createMappingNode,
  validateMapping,
  getMappingNodes,
  handleArrayMapping,
} from '~/utils/datamapper_utils/mapping-node-utils'
import Button from '~/components/inputs/button'
import GenerateButton from '~/components/datamapper/basic-components/generate-button'
import { updateCanvasSize } from '~/utils/datamapper_utils/canvas-management-utils'
import { getNodesByTypeAndId } from '~/utils/datamapper_utils/property-node-utils'
import type { MappingListConfig } from '~/types/datamapper_types/config-types'

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

  const [reactFlowNodes, setReactFlowNodes] = useState<Node[]>(INITIAL_NODES)
  const [edges, setEdges] = useState<Edge[]>(INITIAL_EDGES)
  const [canvasSize, setCanvasSize] = useState({ height: 200 })
  const [addFieldModal, setAddFieldModal] = useState(false)
  const [addMappingModal, setAddMappingModal] = useState(false)

  const [editingNode, setEditingNode] = useState<CustomNodeData | null>(null)
  const [editingMapping, setEditingMapping] = useState<MappingNodeData | null>(null)

  const openModalType = useRef<'source' | 'target'>('source')

  const possibleParentGroups = useRef<NodeLabels[]>([])
  const [mappingSources, setMappingSources] = useState<NodeLabels[]>([])
  const [mappingTargets, setMappingTargets] = useState<NodeLabels[]>([])
  const canvasWidth = useRef<HTMLDivElement>(null)

  const editingMappingRef = useRef<MappingNodeData | null>(null)

  useEffect(() => {
    editingMappingRef.current = editingMapping
  }, [editingMapping])

  const flow = useFlowManagement({
    reactFlowInstance,
    config,
    setReactFlowNodes,
    setEdges,
  })
  const { sourceSchematics, targetSchematic, clearFiles } = useFile()

  const openMapping = useCallback(() => {
    requestAnimationFrame(() => {
      const nodes = reactFlowInstance.getNodes()
      const edges = reactFlowInstance.getEdges()

      const { sources, targets, unfilteredSources } = getMappingNodes(
        nodes,
        edges,
        editingMappingRef.current || undefined,
      )

      if (!editingMappingRef.current) {
        const error = validateMapping(sources, targets, unfilteredSources)
        if (error) {
          showErrorToast(error)
          return
        }

        const checkedSources = sources.filter((s) => s.checked)
        const checkedTargets = targets.filter((t) => t.checked)

        try {
          const isArrayMapping = handleArrayMapping(
            checkedSources,
            checkedTargets,
            nodes,
            edges,
            setReactFlowNodes,
            setEdges,
          )

          if (isArrayMapping) return
        } catch (error) {
          if (error instanceof Error) {
            showErrorToast(error.message)
            return
          } else {
            throw error
          }
        }
      }

      openMappingModal(sources, targets)
    })
  }, [reactFlowInstance])

  const nodeTypes: NodeTypes = useMemo(() => {
    return getNodeTypes({
      flow,
      setReactFlowNodes,
      setEditingNode,
      setAddFieldModal,
      openModelType: openModalType,
      setEditingMapping,
      openMapping,
    })
    //Don't add flow as dependancy here, it'll become an infinite loop flow changes every rerender --> updates the memo --> the memo updates the nodetypes --> updating the nodetypes causes react to trigger a rerender resulting in a infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openMapping]) //UseMemo is used here to ensure nodetype is not changed throughout rerenders. If the variable is updated reactflow throws a warning in the console;

  useEffect(() => {
    if (!reactFlowInstance) return

    const updateSize = () => {
      requestAnimationFrame(() => {
        flow.calculateTablePositions(canvasWidth.current?.offsetWidth ?? 0)
      })
    }

    window.addEventListener('resize', updateSize)

    // delay initial run
    requestAnimationFrame(updateSize)

    return () => {
      window.removeEventListener('resize', updateSize)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reactFlowInstance]) //Adding flow as dependancy here breaks the importing.

  useEffect(() => {
    if (!reactFlowInstance) return

    configDispatch({
      type: 'SET_PROPERTY_DATA',
      payload: reactFlowInstance.toObject(),
    })
  }, [reactFlowNodes, edges, reactFlowInstance, configDispatch])

  //Updates the outer canvas whenever something is added
  useEffect(() => {
    setCanvasSize((size) => updateCanvasSize(reactFlowNodes, size))
  }, [reactFlowNodes])

  const onRestore = useCallback(() => {
    const restoreFlow = async () => {
      if (config.propertyData) flow.importJsonConfiguration(JSON.stringify(config.propertyData))
    }

    restoreFlow()
  }, [config.propertyData, flow])

  useEffect(() => {
    if (!reactFlowInstance || initHasRun.current) return
    initHasRun.current = true

    if (config.propertyData.nodes && config.propertyData.nodes.length > 1) {
      onRestore()
    }
    const loadSchematics = async () => {
      try {
        if (config.propertyData.nodes && config.propertyData.nodes.length > 1) {
          onRestore()
        }

        if (targetSchematic) {
          await flow.importSchematic(targetSchematic, 'target')
        }

        if (sourceSchematics.length > 0) {
          await flow.importMultipleSchematics(sourceSchematics)
        }
      } catch (error) {
        if (error instanceof Error) {
          showErrorToast(error.message)
        }
      } finally {
        clearFiles()
      }
    }

    loadSchematics()
    clearFiles()
  }, [clearFiles, config.propertyData.nodes, flow, onRestore, reactFlowInstance, sourceSchematics, targetSchematic])

  const onReactFlowNodeChange = useCallback(
    (changes: NodeChange[]) => setReactFlowNodes((nodes) => applyNodeChanges(changes, nodes) as Node[]),
    [],
  )

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) =>
      setEdges((edges) => {
        return applyEdgeChanges(changes, edges)
      }),
    [],
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      const connectedIds = new Set<string>()

      if (connection?.source) connectedIds.add(connection.source)
      if (connection?.target) connectedIds.add(connection.target)
      setReactFlowNodes((previous) =>
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
    },
    [openMapping],
  )

  function openMappingModal(sources: NodeLabels[], targets: NodeLabels[]) {
    setMappingSources(sources.filter((s) => s.id?.includes('item')))
    setMappingTargets(targets.filter((t) => t.id?.includes('item')))
    setAddMappingModal(true)
  }

  async function saveField(data: CustomNodeData) {
    if (!reactFlowInstance) {
      setAddFieldModal(false)
      setEditingNode(null)
      return
    }

    try {
      if (editingNode) {
        flow.editNode(data)
      } else {
        await flow.addNodeSequential(
          openModalType.current as 'source' | 'target',
          data.label,
          data.variableType,
          data.defaultValue ?? null,
          data.parentId,
          null,
          data.isAttribute,
        )
      }
      setEditingNode(null)
      setAddFieldModal(false)
      showSuccessToast('Added property succesfully!')
    } catch (error) {
      if (error instanceof Error) {
        showErrorToast(error.message)
      } else {
        throw error
      }
    }
  }
  async function saveMapping(mappingConfig: MappingNodeData) {
    if (!reactFlowInstance) {
      setAddMappingModal(false)

      return
    }
    const { updatedNodes, updatedEdges } = createMappingNode(mappingConfig, reactFlowNodes, edges)

    setReactFlowNodes(updatedNodes)
    setEdges(updatedEdges)
    setEditingMapping(null)
    setAddMappingModal(false)
    showSuccessToast('Added mapping succesfully!')
    setReactFlowNodes((previous) =>
      previous.map((node) => ({
        ...node,
        data: {
          ...node.data,
          checked: false,
        },
      })),
    )
  }
  function openAddFieldModal(modelType: 'source' | 'target') {
    possibleParentGroups.current = getNodesByTypeAndId(reactFlowInstance?.getNodes(), {
      typeIncludes: modelType === 'source' ? ['labeledGroup', 'extraSourceNode'] : 'labeledGroup',
      idIncludes: modelType,
    })

    openModalType.current = modelType
    setAddFieldModal(true)
  }

  return (
    <div className="w-full" ref={canvasWidth}>
      <div className="mt-4 h-[30px] px-4">
        <div className="absolute right-[65%] flex flex-row items-center justify-between px-45">
          <h1 className="text-l font-semibold">Source: {config.formatTypes.source?.name}</h1>
        </div>
        <div className="absolute right-[45%] left-[45%] flex flex-row items-center justify-between">
          <GenerateButton highlightUnset={flow.highlightUnset} mappingListConfig={config} />
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
            nodes={reactFlowNodes.map((node) => ({
              ...node,
              data: {
                ...node.data,
                checked: node.data?.checked ?? false,
                setNodes: setReactFlowNodes,
              },
            }))}
            edges={edges}
            onNodesChange={onReactFlowNodeChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onConnectStart={flow.checkForDragScroll}
            onConnectEnd={flow.endCheckForDragScroll}
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
        isOpen={addFieldModal}
        onClose={() => {
          setAddFieldModal(false)
          setEditingNode(null)
        }}
      >
        <AddFieldForm
          fieldType={openModalType.current}
          initialData={editingNode}
          parents={possibleParentGroups.current}
          formatDefinition={config.formatTypes}
          onSave={saveField}
        />
      </Modal>
      <Modal
        isOpen={addMappingModal}
        onClose={() => {
          setAddMappingModal(false)
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
      {!addMappingModal && !addFieldModal && (
        <div className="pointer-events-none fixed right-0 bottom-4 left-0 z-60 min-w-75">
          <div className="pointer-events-auto relative flex w-full justify-between px-12">
            <Button
              className="absolute bottom-[2vh] left-1/4 z-10 rounded-md border px-4 py-2"
              onClick={() => openAddFieldModal('source')}
            >
              Add Source
            </Button>
            <Button
              className="bg-foreground-active hover:bg-hover absolute bottom-[2vh] left-1/2 z-10 -translate-x-1/2 rounded-2xl border px-4 py-2 text-neutral-900"
              onClick={openMapping}
            >
              MAP
            </Button>
            <Button
              className="absolute right-1/4 bottom-[2vh] z-10 rounded-2xl border px-4 py-2"
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
