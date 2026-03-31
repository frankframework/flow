import { type Dispatch, type SetStateAction, useEffect, useRef } from 'react'
import type { Node, Edge, ReactFlowInstance, Viewport } from '@xyflow/react'
import type { MappingListConfig } from '~/types/datamapper_types/config-types'
import type { SourceSchematic } from '~/stores/datamapper_state/schemaQueue/schema-queue-context'
import type { CustomNodeData } from '~/types/datamapper_types/react-node-types'
import { GROUP_PADDING_TOP, SCROLL_AMOUNT, SCROLL_PANE_HEIGHT, THROTTLE_MS } from '~/utils/datamapper_utils/constant'
import { getTablePositions } from '~/utils/datamapper_utils/canvas-management-utils'
import {
  calculateNodePosition,
  checkDuplicateLabel,
  deleteNodeById,
  generateNodeId,
  getGroupWidth,
  getReactflowType,
  getUnsetNodeIds,
  isGroup,
  sequentialReposition,
  updateNodeType,
} from '~/utils/datamapper_utils/property-node-utils'
import {
  applyHighlightToElements,
  applyUnsetHighlightToNodes,
  getHighlightedFromMappingNode,
  getHighlightedFromPropertyNode,
  resetHighlightElements,
} from '~/utils/datamapper_utils/highlight-utils'
import { importJsonSchema, importXsdSchema } from '~/utils/datamapper_utils/schema-utils'
import { deleteMappingNode } from '~/utils/datamapper_utils/mapping-node-utils'

interface UseFlowManagementProperties {
  reactFlowInstance: ReactFlowInstance
  config: MappingListConfig
  setReactFlowNodes: Dispatch<SetStateAction<Node[]>>
  setEdges: Dispatch<SetStateAction<Edge[]>>
}

export function useFlowManagement({
  reactFlowInstance,
  config,
  setReactFlowNodes,
  setEdges,
}: UseFlowManagementProperties) {
  const sourceIdCounter = useRef(0)
  const targetIdCounter = useRef(0)
  const lastUpdate = useRef(0)
  const lastPosition = useRef<Viewport>(reactFlowInstance.getViewport())
  const scrollIntervalEnabled = useRef(false)

  useEffect(() => {
    const updatePosition = (event: MouseEvent) => {
      if (scrollIntervalEnabled.current) {
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
    }

    // Listen globally
    document.addEventListener('mousemove', updatePosition)

    return () => {
      document.removeEventListener('mousemove', updatePosition)
    }
  }, [reactFlowInstance])

  function generateReactFlowObject(previous: Node[], data: CustomNodeData): Node {
    //Calculate the position the node is to be placed at. This isn't always very accurate and will be corrected later after adding
    const newY = calculateNodePosition(previous, data.parentId, reactFlowInstance.getNode)
    //Set the correct type of the node

    //Create the node Obj
    const newNode: Node = {
      id: data.id,
      position: { x: 10, y: newY },
      parentId: data.parentId,
      extent: 'parent',
      type: getReactflowType(data.variableType, data.parentId),
      data,
    }

    //Add empty padding in case the item is an object, purely visual
    if (isGroup(data.variableType)) {
      newNode.height = GROUP_PADDING_TOP * 3
    }

    return newNode
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
    parentId = parentId == null || parentId === '' ? `${side}-table` : parentId

    const formatType = config?.formatTypes?.[side]
    if (formatType && !formatType.duplicateKeysAllowed) {
      //If there's a format set, and it doesn't allow for duplicate keys...
      checkDuplicateLabel(reactFlowInstance.getNodes(), parentId, label, formatType)
    }

    const resolvedId = generateNodeId(side, parentId, variableType, id, sourceIdCounter, targetIdCounter)

    //Generate reactflow object from the values
    setReactFlowNodes((previous) => {
      const newNode = generateReactFlowObject(previous, {
        id: resolvedId,
        label,
        parentId,
        variableType,
        variableTypeBasic: formatType?.properties.find((a) => a.name == variableType)?.type,
        defaultValue: defaultValue ?? '',
        width: getGroupWidth(parentId, reactFlowInstance.getNode),
        isAttribute,
      })

      return [...previous, newNode]
    })

    // wait until React Flow has measured the node
    const measuredNode = await waitForMeasuredNode(resolvedId)

    // reposition after measurement to ensure proper placement/spacing
    repositionForceUpdate(measuredNode)

    return resolvedId
  }

  function editNode(data: CustomNodeData) {
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
    setReactFlowNodes((previous) =>
      previous.map((node) =>
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

  function deleteNode(id: string) {
    let deletedNode: Node | undefined

    setReactFlowNodes((previous) => {
      const result = deleteNodeById(previous, id, (nodes, parentId) =>
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

  function repositionForceUpdate(editingNode: Node) {
    //This function is VERY inefficient but the animation frame updates are sadly necessery for reactflow to properly calculate the height of an object

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setReactFlowNodes((previous) => {
          const newNodes = sequentialReposition(previous, editingNode.parentId!, reactFlowInstance.getNode)
          return newNodes
        })

        // Find the parent of the current node and recurse, this is needed to update parents whenever an edit happens
        if (editingNode.parentId) {
          const parentNode = reactFlowInstance.getNode(editingNode.parentId)
          if (parentNode?.parentId) {
            requestAnimationFrame(() =>
              //Additional animation check here fixes no update after edit
              repositionForceUpdate(parentNode),
            )
          }
        }
      })
    })
  }

  function forceViewportLocation() {
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

  function checkForDragScroll() {
    lastPosition.current = reactFlowInstance.getViewport()
    scrollIntervalEnabled.current = true
  }
  function endCheckForDragScroll() {
    scrollIntervalEnabled.current = false
    reactFlowInstance.setViewport(lastPosition.current)
  }

  //Apply highlights to all objects in the set. This is done by setting all ids not in the list to opacity 0.1
  function applyHighlight(highlightedNodes: Set<string>) {
    const nodes = reactFlowInstance.getNodes()
    const edges = reactFlowInstance.getEdges()

    const result = applyHighlightToElements(nodes, edges, highlightedNodes)

    setEdges(result.edges)
    setReactFlowNodes(result.nodes)
  }

  //Highlights fields from a mapping node
  function highlightFromMappingNode(id: string) {
    const edges = reactFlowInstance.getEdges()
    const highlighted = getHighlightedFromMappingNode(edges, id)

    applyHighlight(highlighted)
  }

  //Highlights fields whenever the button on a property node is pressed
  function highlightFromPropertyNode(nodeId: string) {
    const nodes = reactFlowInstance.getNodes()
    const edges = reactFlowInstance.getEdges()

    const highlighted = getHighlightedFromPropertyNode(nodes, edges, nodeId)

    applyHighlight(highlighted)
  }

  //Sets opacity to 1 to fully reset any highlighting
  function resetHighlight() {
    const nodes = reactFlowInstance.getNodes()
    const edges = reactFlowInstance.getEdges()

    const result = resetHighlightElements(nodes, edges)

    setEdges(result.edges)
    setReactFlowNodes(result.nodes)
  }

  function highlightUnset() {
    const nodes = reactFlowInstance.getNodes()
    const edges = reactFlowInstance.getEdges()

    const unsetNodeIds = getUnsetNodeIds(nodes, edges)
    const updatedNodes = applyUnsetHighlightToNodes(nodes, unsetNodeIds)

    setReactFlowNodes(updatedNodes)
  }

  // Imports an XSD schema into a table

  // Resolves primitive type

  //Imports a json reactflow configuration into the active reactflow frame
  function importJsonConfiguration(jsonConfiguration: string) {
    const flow = JSON.parse(jsonConfiguration)
    if (flow) {
      setReactFlowNodes(flow.nodes || [])
      setEdges(flow.edges || [])
      sourceIdCounter.current = flow.nodes.filter((node: Node) => node.id.includes('source')).length
      targetIdCounter.current = flow.nodes.filter((node: Node) => node.id.includes('target')).length
    }
  }

  //Waits for the node to be measurable(So added fully) before moving on to the next task. Uses
  function waitForMeasuredNode(id: string): Promise<Node> {
    return new Promise((resolve) => {
      const loop = () => {
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

  function deleteMapping(id: string) {
    const { remainingNodes, remainingEdges } = deleteMappingNode(
      id,
      reactFlowInstance.getNodes(),
      reactFlowInstance.getEdges(),
    )
    setReactFlowNodes(remainingNodes)
    setEdges(remainingEdges)
  }

  function calculateTablePositions(width: number) {
    const { sourceX, mappingX, targetX } = getTablePositions(width)

    reactFlowInstance.setNodes((nodes) =>
      nodes.map((node) => {
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

  async function clearTarget() {
    setReactFlowNodes((previous: Node[]) => {
      let updatedNodes = previous.filter((node) => !node.parentId?.startsWith('target'))
      return updatedNodes
    })
  }

  async function importSchematic(file: File, side: 'source' | 'target', name = '') {
    let parentId = null
    if (side === 'target') {
      await clearTarget()
    }
    if (name && side == 'source') {
      parentId = await addNodeSequential(side, name, 'schematic')
    }
    const text = await file.text()
    if (config.formatTypes[side]?.schemaFileExtension === '.schema.json') {
      const parsed = JSON.parse(text)
      await importJsonSchema(parsed, side, parentId, addNodeSequential, config.formatTypes[side])
    } else if (config.formatTypes[side]?.schemaFileExtension === '.xsd') {
      await importXsdSchema(text, side, parentId, addNodeSequential, config.formatTypes[side]) // pass raw XML text
    }
  }

  async function importMultipleSchematics(sourceSchematics: SourceSchematic[]) {
    for (const schematic of sourceSchematics.toSorted((schematicA, schematicB) => {
      // Wierd sorting function, but basically this make sure any without a name are placed first in the list, to ensure the base is at the top of the list
      const aName = schematicA.name ?? ''
      const bName = schematicB.name ?? ''

      if (aName === '' && bName !== '') return -1
      if (aName !== '' && bName === '') return 1
      if (aName === '' && bName === '') return 0

      // TS now knows both are strings
      return aName.localeCompare(bName)
    })) {
      await importSchematic(schematic.file, 'source', schematic.name)
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
    importMultipleSchematics,
    highlightUnset,
    checkForDragScroll,
    endCheckForDragScroll,
  }
}
