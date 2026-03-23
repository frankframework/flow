import { type Dispatch, type SetStateAction, useEffect, useRef } from 'react'
import type { Node, Edge, ReactFlowInstance, Viewport } from '@xyflow/react'

import { SAXParser } from 'sax-ts'
import type { MappingListConfig } from '~/types/datamapper_types/config-types'
import type { JsonSchema, SaxAttributes, XsdComplexType, XsdElement } from '~/types/datamapper_types/schema-types'
import type { SourceSchematic } from '~/stores/datamapper_state/schemaQueue/schema-queue-context'
import type { CustomNodeData, NodeLabels } from '~/types/datamapper_types/node-types'
import {
  OBJECT_HEIGHT,
  GROUP_PADDING_TOP,
  THROTTLE_MS,
  ITEM_GAP,
  TABLE_WIDTH,
  MAPPING_TABLE_WIDTH,
} from '~/utils/datamapper_utils/const'
import {
  deleteMappingNode,
  getNodesByTypeAndId,
  getType,
  isGroup,
  isNodeGroup,
} from '~/utils/datamapper_utils/react-node-utils'

interface UseFlowManagementProperties {
  reactFlowInstance: ReactFlowInstance
  config: MappingListConfig
  setReactFlowNodes: Dispatch<SetStateAction<Node[]>>
  setEdges: Dispatch<SetStateAction<Edge[]>>
}

//Updates outer Reactflow canvas. This probably should be moved out of this file?
function updateCanvasSize(nodes: Node[], currentSize: { height: number }) {
  const maxY = nodes.reduce((max, node) => {
    const nodeHeight = node.height ?? OBJECT_HEIGHT
    const nodeBottom = (node.position.y ?? 0) + nodeHeight + 20
    return Math.max(max, nodeBottom)
  }, 0)

  if (maxY > currentSize.height) {
    return { ...currentSize, height: maxY }
  }
  return { ...currentSize, height: maxY }
}
function getConnectedNodes(edges: Edge[], from: Set<string>, exclude: Set<string> = new Set<string>()): Set<string> {
  const result = new Set<string>()

  for (const { source, target } of edges) {
    if (from.has(source) && !exclude.has(target)) result.add(target)
    if (from.has(target) && !exclude.has(source)) result.add(source)
  }

  return result
}

export class DuplicateLabelException extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UserException'
    Object.setPrototypeOf(this, DuplicateLabelException.prototype)
  }
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
        const topThreshold = 150
        const bottomThreshold = window.innerHeight - 150
        if (event.clientY < topThreshold) {
          reactFlowInstance.setViewport({
            x: reactFlowInstance.getViewport().x,
            y: reactFlowInstance.getViewport().y + 10,
            zoom: 1, //Don't set this to 0, it results in NaN for X & Y
          })
        }

        if (event.clientY > bottomThreshold) {
          reactFlowInstance.setViewport({
            x: reactFlowInstance.getViewport().x,
            y: reactFlowInstance.getViewport().y - 10,
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
  }, [])

  function generateReactFlowObject(previous: Node[], data: CustomNodeData): Node {
    //Calculate the position the node is to be placed at. This isn't always very accurate and will be corrected later after adding
    const newY: number = calculateNodePosition(previous, data.parentId)
    //Set the correct type of the node

    //Create the node Obj
    const newNode: Node = {
      id: data.id,
      position: { x: 10, y: newY },
      parentId: data.parentId,
      extent: 'parent',
      type: getType(data.variableType, data.parentId),
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
  ): Promise<string> {
    //If parent id == null OR parentId == '', initialize parent id, otherwise set parentId to parentId
    parentId = parentId == null || parentId === '' ? `${side}-table` : parentId

    const formatType = config?.formatTypes?.[side]
    //If there's a format set, and it doesn't allow for duplicate keys...
    if (formatType && !formatType.duplicateKeysAllowed) {
      //Search for any items where parentId and label are identical
      const duplicate = reactFlowInstance.getNodes().some((n) => n.parentId === parentId && n.data?.label === label)

      if (duplicate) {
        //If any are found: Throw error(This should be displayed in a modal)
        throw new DuplicateLabelException(`Duplicate property not allowed! Change property name.${label}`)
      }
    }

    //create id variable
    let resolvedId: string | null = id ?? null
    //if id not set, generate id
    if (!resolvedId || resolvedId == null || resolvedId == '') {
      //increment the right counter
      const counter = side === 'source' ? sourceIdCounter.current++ : targetIdCounter.current++
      //use counter in id
      resolvedId = isGroup(variableType) ? `${parentId}-group-${counter}` : `${parentId}-item-${counter}`
    }

    //Generate reactflow object from the values
    setReactFlowNodes((previous) => {
      const newNode = generateReactFlowObject(previous, {
        id: resolvedId,
        label,
        parentId,
        variableType,
        variableTypeBasic: formatType?.properties.find((a) => a.name == variableType)?.type,
        defaultValue: defaultValue ?? '',
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
    //If there's a format set, and it doesn't allow for duplicate keys...
    if (formatType && !formatType.duplicateKeysAllowed) {
      //Check for duplicate labels, where parent id and label are the same but Id is not
      const duplicate = reactFlowInstance
        .getNodes()
        .some((node) => node.parentId === data.parentId && node.data?.label === data.label && node.id != data.id)
      if (duplicate) throw new DuplicateLabelException('Duplicate property not allowed! Change property name.')
    }
    //Change type to object if needed.
    const updatedType = getType(data.variableType, data.parentId)
    data.variableTypeBasic = formatType?.properties.find(
      (propertyDefinition) => propertyDefinition.name == data.variableType,
    )?.type
    //Persist node to reactflow
    setReactFlowNodes((previous) =>
      previous.map((node) =>
        node.id === data.id
          ? {
              ...node,
              type: updatedType,

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
    let nodeToDelete: Node | undefined
    setReactFlowNodes((previous: Node[]) => {
      //Find node
      nodeToDelete = previous.find((node) => node.id === id)
      if (!nodeToDelete) return previous
      //Get parent id of node
      const parentId = nodeToDelete.parentId
      let updatedNodes = previous.filter((node) => node.id !== id)
      //If item is a group
      if (nodeToDelete.type && isNodeGroup(nodeToDelete.type)) {
        //remove all child elements
        updatedNodes = updatedNodes.filter((node) => !node.parentId?.startsWith(id))
      }
      if (parentId) {
        //If item has parent set, reposition the items of the parent
        updatedNodes = sequentialReposition(updatedNodes, parentId)
      }

      return updatedNodes
    })
    if (nodeToDelete) {
      //If node has been deleted, force another reposition
      repositionForceUpdate(nodeToDelete)
    }
  }

  function repositionForceUpdate(editingNode: Node) {
    //This function is VERY inefficient but the animation frame updates are sadly necessery for reactflow to properly calculate the height of an object

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setReactFlowNodes((previous) => {
          const newNodes = sequentialReposition(previous, editingNode.parentId!)
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
    setEdges((previousEdges) =>
      previousEdges.map((edge) => {
        const isHighlighted = highlightedNodes.has(edge.source) && highlightedNodes.has(edge.target)

        return {
          ...edge,
          style: {
            ...edge.style,
            opacity: isHighlighted ? 1 : 0.01,
          },
          animated: isHighlighted,
        }
      }),
    )

    setReactFlowNodes((previousNodes) =>
      previousNodes.map((node) => ({
        ...node,
        style: {
          ...node.style,
          opacity: highlightedNodes.has(node.id) ? 1 : 0.2,
        },
      })),
    )
  }

  //Highlights fields from a mapping node
  function highlightFromMappingNode(id: string) {
    const highlightedNodes = new Set<string>()

    for (const edge of reactFlowInstance.getEdges()) {
      if (edge.id.includes(id)) {
        highlightedNodes.add(edge.source)
        highlightedNodes.add(edge.target)
      }
    }

    applyHighlight(highlightedNodes)
  }

  //Highlights fields whenever the button on a property node is pressed
  function highlightFromPropertyNode(nodeId: string) {
    const nodeIds = getNodeAndChildren(nodeId)
    const edges = reactFlowInstance.getEdges()

    const firstHop = getConnectedNodes(edges, nodeIds)
    const secondHop = getConnectedNodes(edges, firstHop, nodeIds)

    applyHighlight(new Set([...nodeIds, ...firstHop, ...secondHop]))
  }
  function getNodeAndChildren(nodeId: string): Set<string> {
    const node = reactFlowInstance.getNode(nodeId)

    if (node && node.type && isNodeGroup(node.type)) {
      return new Set(
        reactFlowInstance
          .getNodes()
          .filter((node) => node.parentId === nodeId)
          .map((node) => node.id),
      )
    }

    return new Set([nodeId])
  }

  //Sets opacity to 1 to fully reset any highlighting
  function resetHighlight() {
    setEdges((previousEdges) =>
      previousEdges.map((edge) => ({
        ...edge,
        style: {
          ...edge.style,
          opacity: 1,
        },
        animated: false,
      })),
    )

    setReactFlowNodes((previousNodes) =>
      previousNodes.map((node) => ({
        ...node,
        style: {
          ...node.style,
          opacity: 1,
          borderWidth: 0,
          borderColor: 'none',
        },
      })),
    )
  }
  function highlightUnset() {
    const unsetNodes: NodeLabels[] = getNodesByTypeAndId(
      reactFlowInstance.getNodes(),
      {
        typeIncludes: 'target',
      },
      reactFlowInstance.getEdges(),
    )
    setReactFlowNodes((previousNodes) =>
      previousNodes.map((node) => {
        const isUnset = unsetNodes.some((nodeLabel) => nodeLabel.id == node.id)

        return {
          ...node,
          style: {
            ...node.style,
            borderColor: isUnset ? (node.data.defaultValue ? 'yellow' : 'red') : 'none',
            borderWidth: isUnset ? 3 : 0,
          },
        }
      }),
    )
  }

  //Imports a json schema into a table
  async function importJsonSchema(schema: JsonSchema, side: 'source' | 'target', parentId: string | null) {
    let isRootObject = true
    async function traverseSchema(object: JsonSchema, parentNodeId: string | null, labelPrefix = '') {
      if (!object) return

      let currentNodeId = parentNodeId

      //Add object
      if (object.type === 'object' && object.properties && (!isRootObject || labelPrefix)) {
        currentNodeId = await addNodeSequential(
          side,
          labelPrefix || 'Object',
          'object',
          object.defaultValue,
          parentNodeId,
        )
      }

      //Add object properties
      if (object.type === 'object' && object.properties) {
        for (const [key, value] of Object.entries(object.properties)) {
          await traverseSchema(value, currentNodeId, key)
        }
        return
      }

      //Add array
      if (object.type === 'array' && object.items) {
        currentNodeId = await addNodeSequential(
          side,
          labelPrefix || 'Array',
          'array',
          object.defaultValue,
          parentNodeId,
        )
        return
      }

      // Primitive types
      const { name } = resolveType(side, object.type)
      await addNodeSequential(side, labelPrefix, name, object.defaultValue, currentNodeId)
    }
    await traverseSchema(schema, parentId)
  }

  // Imports an XSD schema into a table
  async function importXsdSchema(xmlText: string, side: 'source' | 'target', parentId: string | null) {
    const parser = new SAXParser(true, { trim: true, normalize: true })

    const typeMap = new Map<string, XsdComplexType>()
    const complexStack: XsdComplexType[] = []
    const rootElements: XsdElement[] = []

    parser.onopentag = (node: { name: string; attributes: SaxAttributes }) => {
      const { name: tagName, attributes: attrs } = node

      // complexType
      if (tagName.endsWith('complexType')) {
        const typeName = attrs['name'] || ''
        const complexType: XsdComplexType = { '@_name': typeName || undefined, 'xs:sequence': undefined }

        // Attach to current element if unnamed
        const currentElement =
          complexStack.length > 0 ? complexStack.at(-1)!['xs:sequence']?.xs.element?.at(-1) : rootElements.at(-1)

        if (currentElement && !typeName) currentElement['xs:complexType'] = complexType

        complexStack.push(complexType)
      }

      // sequence
      if ((tagName === 'xs:sequence' || tagName === 'xsd:sequence') && complexStack.length > 0) {
        complexStack.at(-1)!['xs:sequence'] = { xs: { element: [] } }
      }

      // element
      if (tagName.endsWith('element')) {
        const element: XsdElement = {
          '@_name': attrs['name'],
          '@_type': attrs['type'],
          '@_maxOccurs': attrs['maxOccurs'],
          '@_minOccurs': attrs['minOccurs'],
          '@_default': attrs['default'],
        }

        if (complexStack.length > 0 && complexStack.at(-1)!['xs:sequence']) {
          complexStack.at(-1)!['xs:sequence']!.xs.element.push(element)
        } else {
          rootElements.push(element)
        }
      }

      // attribute
      if (tagName.endsWith('attribute') && complexStack.length > 0) {
        const currentType = complexStack.at(-1)!
        if (!currentType['xs:attribute']) currentType['xs:attribute'] = []
        currentType['xs:attribute'].push({
          '@_name': attrs['name'],
          '@_type': attrs['type'],
          '@_use': attrs['use'],
        })
      }
    }

    parser.onclosetag = (tagName: string) => {
      if (tagName.endsWith('complexType') && complexStack.length > 0) {
        const completed = complexStack.pop()!
        if (completed['@_name']) typeMap.set(completed['@_name'], completed)
      }
    }

    parser.write(xmlText).close()

    const visitedTypes = new Set<string>()

    async function addElementNode(element: XsdElement, parentNodeId: string | null) {
      const name = element['@_name']
      const typeName = element['@_type']
      if (!name) return

      const isArray = element['@_maxOccurs'] && element['@_maxOccurs'] !== '1'
      let nodeId: string

      if (typeName && typeMap.has(typeName)) {
        nodeId = await addNodeSequential(side, name, isArray ? 'array' : 'object', undefined, parentNodeId)
        if (!visitedTypes.has(typeName)) {
          visitedTypes.add(typeName)
          await traverseComplexType(typeMap.get(typeName)!, nodeId)
        }
      } else if (element['xs:complexType']) {
        nodeId = await addNodeSequential(side, name, isArray ? 'array' : 'object', undefined, parentNodeId)
        await traverseComplexType(element['xs:complexType'], nodeId)
      } else {
        const prop = resolveType(side, typeName)
        nodeId = await addNodeSequential(side, name, prop.name, element['@_default'], parentNodeId)
      }

      return nodeId
    }

    async function traverseComplexType(type: XsdComplexType, parentNodeId: string) {
      const sequence = type['xs:sequence']
      if (sequence?.xs?.element) {
        const elements: XsdElement[] = Array.isArray(sequence.xs.element) ? sequence.xs.element : [sequence.xs.element]
        for (const elem of elements) {
          await addElementNode(elem, parentNodeId)
        }
      }

      if (type['xs:attribute']) {
        for (const attr of type['xs:attribute']) {
          const prop = resolveType(side, attr['@_type'])
          await addNodeSequential(side, attr['@_name'], prop.name, undefined, parentNodeId)
        }
      }
    }

    for (const rootElement of rootElements) {
      await addElementNode(rootElement, parentId)
    }
  }

  // Resolves primitive type
  function resolveType(side: 'source' | 'target', rawType?: string): { name: string; basicType: string } {
    const format = config.formatTypes?.[side]
    if (!format) throw new Error(`No format configuration for side "${side}"`)

    if (!rawType) {
      throw new Error('No default string type configured')
    }

    const normalized = rawType.replace(/^xs:/, '').replace(/^xsd:/, '').toLowerCase()
    const property = format.properties.find((property) => property.name.toLowerCase() === normalized)

    if (!property) throw new Error(`Type "${normalized}" is not configured for format "${format.name}"`)

    return { name: property.name, basicType: property.type }
  }

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
  //Function used to calculate exact position node is to be placed at.
  function calculateNodePosition(previous: Node[], parentId: string) {
    //Get list of all future siblings
    const futureSiblings = previous.filter((node) => node.parentId === parentId)
    //Get bottom item in the list
    let previousItem: Node | undefined = futureSiblings.at(-1)
    let parentNode = reactFlowInstance.getNode(parentId)

    let newY = 0
    if (previousItem) {
      //Get height of previous item, or set height to 2/3 of standard height
      const measuredHeight = reactFlowInstance?.getNode(previousItem.id)?.measured?.height ?? OBJECT_HEIGHT / 1.5
      newY += (previousItem.position.y ?? 0) + measuredHeight + ITEM_GAP
    } else if (parentNode && parentNode.type && isNodeGroup(parentNode.type)) {
      // If the item is the first in a group, add group padding
      newY += GROUP_PADDING_TOP
    } else {
      //If the item is first in the list, add padding for the title of the list
      newY += ITEM_GAP
    }

    return newY
  }

  //Function used to reposition the entire list, whenever a update happens(Create/Update/Delete)
  function sequentialReposition(nodes: Node[], startParentId: string): Node[] {
    let parentId: string | null = startParentId

    while (parentId) {
      const parentNode = reactFlowInstance.getNode(parentId)
      //Add the correct initial padding for the first item
      let yOffset: number = parentNode && parentNode.type && isNodeGroup(parentNode.type) ? GROUP_PADDING_TOP : ITEM_GAP

      //Get all children of parent and sort them by position
      const children = nodes
        .filter((node) => node.parentId === parentId)
        .toSorted((nodeA, nodeB) => (nodeA.position.y ?? 0) - (nodeB.position.y ?? 0))

      for (const child of children) {
        //Get height of child, or default to standard if it cannot be found
        const height: number = reactFlowInstance.getNode(child.id)?.measured?.height ?? OBJECT_HEIGHT
        //Set position of child, because the children objects is a ref to nodes it also updates the  values in nodes
        child.position = { ...child.position, y: yOffset }
        //Add height and padding to next child height
        yOffset += height + ITEM_GAP
      }
      if (parentNode && parentNode.type && isNodeGroup(parentNode.type)) yOffset += GROUP_PADDING_TOP

      //Set height for parent
      nodes = nodes.map((node) => (node.id === parentId ? { ...node, height: yOffset } : node))
      //Add padding at the bottom of a group
      //Move up one
      parentId = reactFlowInstance.getNode(parentId)?.parentId ?? null
    }

    return [...nodes]
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
    const padding = (width - TABLE_WIDTH * 2 - MAPPING_TABLE_WIDTH) / 4

    const sourceX = padding
    const mappingX = sourceX + padding + TABLE_WIDTH
    const targetX = mappingX + MAPPING_TABLE_WIDTH + padding

    reactFlowInstance.setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === 'source-table') {
          return {
            ...node,
            position: { ...node.position, x: sourceX },
          }
        }
        if (node.id === 'mapping-table') {
          return {
            ...node,
            position: { ...node.position, x: mappingX },
          }
        }
        if (node.id === 'target-table') {
          return {
            ...node,
            position: { ...node.position, x: targetX },
          }
        }

        return node
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
      await importJsonSchema(parsed, side, parentId)
    } else if (config.formatTypes[side]?.schemaFileExtension === '.xsd') {
      await importXsdSchema(text, side, parentId) // pass raw XML text
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
    updateCanvasSize,
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
