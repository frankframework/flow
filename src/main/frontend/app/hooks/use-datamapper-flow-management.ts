import type { Edge, Node, ReactFlowInstance, Viewport } from '@xyflow/react'
import { type Dispatch, type SetStateAction, useEffect, useRef } from 'react'
import { showErrorToast } from '~/components/toast'
import type { MappingListConfig } from '~/types/datamapper_types/config-types'
import type { FormatDefinition } from '~/types/datamapper_types/data-types'
import type { CustomNodeData } from '~/types/datamapper_types/react-node-types'
import type { JsonSchema } from '~/types/datamapper_types/schema-types'
import { getTablePositions } from '~/utils/datamapper_utils/canvas-management-utils'
import { SCROLL_AMOUNT, SCROLL_PANE_HEIGHT, THROTTLE_MS } from '~/utils/datamapper_utils/constant'
import {
  applyHighlightToElements,
  applyUnsetHighlightToNodes,
  getHighlightedFromMappingNode,
  getHighlightedFromPropertyNode,
  resetHighlightElements,
} from '~/utils/datamapper_utils/highlight-utils'
import { deleteMappingNode } from '~/utils/datamapper_utils/mapping-node-utils'
import {
  checkDuplicateLabel,
  deleteNodeById,
  generateNodeId,
  generateReactFlowObject,
  getGroupWidth,
  getUnsetNodeIds,
  sequentialReposition,
  updateNodeType,
} from '~/utils/datamapper_utils/property-node-utils'
import { generateImportButton, importJsonSchema, importXsdSchema } from '~/utils/datamapper_utils/schema-utils'

type UseFlowManagementProperties = {
  reactFlowInstance: ReactFlowInstance
  config: MappingListConfig
  setReactFlowNodes: Dispatch<SetStateAction<Node[]>>
  setEdges: Dispatch<SetStateAction<Edge[]>>
}
export type SequentialRepositionFn = (nodes: Node[], parentId: string) => Node[]
export type GetNodeFunction = (id: string) => Node | undefined
export type AddNodeFunction = (
  side: 'source' | 'target',
  label: string,
  variableType: string,
  defaultValue?: string | null,
  parentId?: string | null,
  id?: string | null,
  isAttribute?: boolean,
) => Promise<string>
export type ImportSchematicFunction = (file: File, side: 'source' | 'target', name: string) => void

export function useFlowManagement({
  reactFlowInstance,
  config,
  setReactFlowNodes,
  setEdges,
}: UseFlowManagementProperties): {
  addNodeSequential: (
    side: 'source' | 'target',
    label: string,
    variableType: string,
    defaultValue?: string | null,
    parentId?: string | null,
    id?: string | null,
    isAttribute?: boolean,
  ) => Promise<string>
  editNode: (data: CustomNodeData) => void
  deleteNode: (id: string) => void
  clearTarget: () => Promise<void>
  repositionForceUpdate: (editingNode: Node) => void
  highlightFromMappingNode: (id: string) => void
  highlightFromPropertyNode: (nodeId: string) => void
  resetHighlight: () => void
  forceViewportLocation: () => void
  importJsonSchema: (
    schema: JsonSchema,
    side: 'source' | 'target',
    parentId: string | null,
    addNode: AddNodeFunction,
    format: FormatDefinition,
  ) => Promise<void>
  importJsonConfiguration: (jsonConfiguration: string) => void
  deleteMapping: (id: string) => void
  calculateTablePositions: (width: number) => void
  importSchematic: (file: File, side: 'source' | 'target', name?: string) => Promise<void>
  highlightUnset: () => void
  checkForDragScroll: () => void
  endCheckForDragScroll: () => void
  addSchematicImportButton: (side: 'source' | 'target') => Promise<void>
} {
  const sourceIdCounter = useRef(0)
  const targetIdCounter = useRef(0)
  const lastUpdate = useRef(0)
  const lastPosition = useRef<Viewport>(reactFlowInstance.getViewport())
  const scrollIntervalEnabled = useRef(false)

  useEffect((): (() => void) => {
    const updatePosition = (event: MouseEvent): void => {
      if (!scrollIntervalEnabled.current) {
        return
      }

      const bottomThreshold = window.innerHeight - SCROLL_PANE_HEIGHT
      if (event.clientY < SCROLL_PANE_HEIGHT) {
        reactFlowInstance.setViewport({
          x: reactFlowInstance.getViewport().x,
          y: reactFlowInstance.getViewport().y + SCROLL_AMOUNT,
          zoom: 1, //Don't set this to 0, it results in NaN for X & Y
        })
      }

      if (event.clientY > bottomThreshold) {
        reactFlowInstance.setViewport({
          x: reactFlowInstance.getViewport().x,
          y: reactFlowInstance.getViewport().y - SCROLL_AMOUNT,
          zoom: 1, //Don't set this to 0, it results in NaN for X & Y
        })
      }
    }

    // Listen globally
    document.addEventListener('mousemove', updatePosition)

    return (): void => {
      document.removeEventListener('mousemove', updatePosition)
    }
  }, [reactFlowInstance])
  async function addSchematicImportButton(side: 'source' | 'target'): Promise<void> {
    deleteNode(`${side}-import-button`) //Failsafe to make sure there can never be more then 1
    const fileType = config.formatTypes[side]?.schemaFileExtension
    if (!fileType) {
      showErrorToast('Invalid configuration!')
      return
    }
    const node = generateImportButton(
      reactFlowInstance.getNodes(),
      fileType,
      side,
      reactFlowInstance.getNode,
      importSchematic,
    )
      .then((newNode: Node): Promise<Node> => {
        setReactFlowNodes((previous): Node[] => [...previous, newNode])

        return waitForMeasuredNode(newNode.id)
      })
      .then((measuredNode): void => {
        repositionForceUpdate(measuredNode)
      })
    return node
    // reposition after measurement to ensure proper placement/spacing
  }

  async function addNodeSequential(
    side: 'source' | 'target',
    label: string,
    variableType: string,
    defaultValue?: string | null,
    parentId?: string | null,
    id?: string | null,
    isAttribute?: boolean,
  ): Promise<string> {
    //If parent id == null OR parentId == '', initialize parent id, otherwise set parentId to parentId
    parentId = parentId === '' || parentId == null ? `${side}-table` : parentId

    const formatType = config?.formatTypes?.[side]
    if (formatType && !formatType.duplicateKeysAllowed) {
      //If there's a format set, and it doesn't allow for duplicate keys...
      checkDuplicateLabel(reactFlowInstance.getNodes(), parentId, label, formatType)
    }

    const resolvedId = generateNodeId(side, parentId, variableType, id, sourceIdCounter, targetIdCounter)

    //Generate reactflow object from the values
    setReactFlowNodes((previous): Node[] => {
      const newNode = generateReactFlowObject(
        previous,
        {
          id: resolvedId,
          label,
          parentId,
          variableType,
          variableTypeBasic: formatType?.properties.find((a): boolean => a.name == variableType)?.type,
          defaultValue: defaultValue ?? '',
          width: getGroupWidth(parentId, reactFlowInstance.getNode),
          isAttribute,
        },
        reactFlowInstance.getNode,
      )

      return [...previous, newNode]
    })

    // wait until React Flow has measured the node
    const measuredNode = await waitForMeasuredNode(resolvedId)

    // reposition after measurement to ensure proper placement/spacing
    repositionForceUpdate(measuredNode)

    return resolvedId
  }

  function editNode(data: CustomNodeData): void {
    if (!data) return
    //Retrieve side variable(Aka if the node is a target or source node)
    const side = data.parentId?.includes('source') ? 'source' : 'target'
    const formatType = config?.formatTypes?.[side]
    if (!formatType) return

    //If there's a format set, and it doesn't allow for duplicate keys...
    if (!formatType.duplicateKeysAllowed) {
      //Check for duplicate labels, where parent id and label are the same but Id is not
      checkDuplicateLabel(reactFlowInstance.getNodes(), data.parentId!, data.label, formatType, data.id)
    }
    //Change type to object if needed.

    const { updatedReactflowType, variableTypeBasic } = updateNodeType(data, formatType)
    data.width = getGroupWidth(data.parentId, reactFlowInstance.getNode)
    data.variableTypeBasic = variableTypeBasic
    //Persist node to reactflow
    setReactFlowNodes((previous): Node[] =>
      previous.map((node): Node =>
        node.id === data.id
          ? {
              ...node,
              type: updatedReactflowType,

              data: data,
            }
          : node,
      ),
    )
    //Retrieve updated node
    const updatedNode = reactFlowInstance.getNode(data.id)
    //If updated node is found, force a reposition over the correct table.
    if (updatedNode) repositionForceUpdate(updatedNode)
  }

  function deleteNode(id: string): void {
    let deletedNode: Node | undefined

    setReactFlowNodes((previous): Node[] => {
      const result = deleteNodeById(previous, id, (nodes, parentId): Node[] =>
        sequentialReposition(nodes, parentId, reactFlowInstance.getNode),
      )
      deletedNode = result.deletedNode
      return result.updatedNodes
    })

    if (deletedNode) {
      // Force reposition if node was deleted
      repositionForceUpdate(deletedNode)
    }
  }

  function repositionForceUpdate(editingNode: Node): void {
    //This function is VERY inefficient but the animation frame updates are sadly necessery for reactflow to properly calculate the height of an object

    requestAnimationFrame((): void => {
      requestAnimationFrame((): void => {
        setReactFlowNodes((previous): Node[] => {
          const newNodes = sequentialReposition(previous, editingNode.parentId!, reactFlowInstance.getNode)
          return newNodes
        })

        // Find the parent of the current node and recurse, this is needed to update parents whenever an edit happens
        if (editingNode.parentId) {
          const parentNode = reactFlowInstance.getNode(editingNode.parentId)
          if (parentNode?.parentId) {
            requestAnimationFrame((): void =>
              //Additional animation check here fixes no update after edit
              repositionForceUpdate(parentNode),
            )
          }
        }
      })
    })
  }

  function forceViewportLocation(): void {
    //This function forces the viewport back to its initial position to prevent a panning out of the view
    const now = Date.now()
    if (now - lastUpdate.current > THROTTLE_MS) {
      lastUpdate.current = now

      reactFlowInstance.setViewport({
        x: 0,
        y: reactFlowInstance.getViewport().y,
        zoom: 1, //Don't set this to 0, it results in NaN for X & Y
      })
    }
  }

  function checkForDragScroll(): void {
    lastPosition.current = reactFlowInstance.getViewport()
    scrollIntervalEnabled.current = true
  }
  function endCheckForDragScroll(): void {
    scrollIntervalEnabled.current = false
    reactFlowInstance.setViewport(lastPosition.current)
  }

  //Apply highlights to all objects in the set. This is done by setting all ids not in the list to opacity 0.1
  function applyHighlight(highlightedNodes: Set<string>): void {
    const nodes = reactFlowInstance.getNodes()
    const edges = reactFlowInstance.getEdges()

    const result = applyHighlightToElements(nodes, edges, highlightedNodes)

    setEdges(result.edges)
    setReactFlowNodes(result.nodes)
  }

  //Highlights fields from a mapping node
  function highlightFromMappingNode(id: string): void {
    const edges = reactFlowInstance.getEdges()
    const highlighted = getHighlightedFromMappingNode(edges, id)

    applyHighlight(highlighted)
  }

  //Highlights fields whenever the button on a property node is pressed
  function highlightFromPropertyNode(nodeId: string): void {
    const nodes = reactFlowInstance.getNodes()
    const edges = reactFlowInstance.getEdges()

    const highlighted = getHighlightedFromPropertyNode(nodes, edges, nodeId)

    applyHighlight(highlighted)
  }

  //Sets opacity to 1 to fully reset any highlighting
  function resetHighlight(): void {
    const nodes = reactFlowInstance.getNodes()
    const edges = reactFlowInstance.getEdges()

    const result = resetHighlightElements(nodes, edges)

    setEdges(result.edges)
    setReactFlowNodes(result.nodes)
  }

  function highlightUnset(): void {
    const nodes = reactFlowInstance.getNodes()
    const edges = reactFlowInstance.getEdges()

    const unsetNodeIds = getUnsetNodeIds(nodes, edges)
    const updatedNodes = applyUnsetHighlightToNodes(nodes, unsetNodeIds)

    setReactFlowNodes(updatedNodes)
  }

  // Imports an XSD schema into a table

  // Resolves primitive type

  //Imports a json reactflow configuration into the active reactflow frame
  function importJsonConfiguration(jsonConfiguration: string): void {
    const flow = JSON.parse(jsonConfiguration)
    if (flow) {
      setReactFlowNodes(flow.nodes || [])
      setEdges(flow.edges || [])
      sourceIdCounter.current = flow.nodes.filter((node: Node): boolean => node.id.includes('source')).length
      targetIdCounter.current = flow.nodes.filter((node: Node): boolean => node.id.includes('target')).length
    }
  }

  //Waits for the node to be measurable(So added fully) before moving on to the next task. Uses
  function waitForMeasuredNode(id: string): Promise<Node> {
    return new Promise((resolve): void => {
      const loop = (): void => {
        const node = reactFlowInstance?.getNode(id)

        if (node && node.measured?.height) {
          resolve(node)
          return
        }

        requestAnimationFrame(loop)
      }

      loop()
    })
  }

  function deleteMapping(id: string): void {
    const { remainingNodes, remainingEdges } = deleteMappingNode(
      id,
      reactFlowInstance.getNodes(),
      reactFlowInstance.getEdges(),
    )
    setReactFlowNodes(remainingNodes)
    setEdges(remainingEdges)
  }

  function calculateTablePositions(width: number): void {
    const { sourceX, mappingX, targetX } = getTablePositions(width)

    reactFlowInstance.setNodes((nodes): Node[] =>
      nodes.map((node): Node => {
        switch (node.id) {
          case 'source-table': {
            return { ...node, position: { ...node.position, x: sourceX } }
          }
          case 'mapping-table': {
            return { ...node, position: { ...node.position, x: mappingX } }
          }
          case 'target-table': {
            return { ...node, position: { ...node.position, x: targetX } }
          }

          default: {
            return node
          }
        }
      }),
    )
  }

  async function clearTarget(): Promise<void> {
    setReactFlowNodes((previous: Node[]): Node[] => {
      return previous.filter((node): boolean => !node.parentId?.startsWith('target'))
    })
  }

  async function importSchematic(file: File, side: 'source' | 'target', name = ''): Promise<void> {
    deleteNode(`${side}-import-button`)

    let parentId = null
    if (side === 'target') {
      await clearTarget()
    }

    if (
      name &&
      side == 'source' &&
      reactFlowInstance.getNodes().filter((node): boolean => node.id.includes('source') && !node.id.includes('import'))
        .length !== 1
    ) {
      parentId = await addNodeSequential(side, name, 'schematic')
    }
    const text = await file.text()
    if (config.formatTypes[side]?.schemaFileExtension === '.schema.json') {
      const parsed = JSON.parse(text)
      await importJsonSchema(parsed, side, parentId, addNodeSequential, config.formatTypes[side])
    } else if (config.formatTypes[side]?.schemaFileExtension === '.xsd') {
      await importXsdSchema(text, side, parentId, addNodeSequential, config.formatTypes[side]) // pass raw XML text
    }

    if (side === 'source') {
      await addSchematicImportButton(side)
    }
  }

  return {
    addNodeSequential,
    editNode,
    deleteNode,
    clearTarget,
    repositionForceUpdate,
    highlightFromMappingNode,
    highlightFromPropertyNode,
    resetHighlight,
    forceViewportLocation,
    importJsonSchema,
    importJsonConfiguration,
    deleteMapping,
    calculateTablePositions,
    importSchematic,
    highlightUnset,
    checkForDragScroll,
    endCheckForDragScroll,
    addSchematicImportButton,
  }
}
