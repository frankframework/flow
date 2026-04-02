import type { Edge, Node } from '@xyflow/react'
import type { CustomNodeData, NodeLabels } from '~/types/datamapper_types/react-node-types'
import { findNodeParent } from './generic-node-utils'
import type { FormatDefinition } from '~/types/datamapper_types/data-types'
import { GROUP_PADDING_TOP, GROUP_WIDTH, ITEM_GAP, OBJECT_HEIGHT } from './constant'
import type { GetNodeFunc, SequentialRepositionFn } from '~/hooks/use-datamapper-flow-management'

export function recurseFindArray(node: Node, nodes: Node[]) {
  const parent = findNodeParent(node, nodes)
  if (!parent) return

  if (parent.type?.includes('Array')) return parent.id

  return recurseFindArray(parent, nodes)
}
export function isGroup(variableType: string): boolean {
  return variableType.includes('object') || variableType.includes('schematic') || variableType.includes('array')
}
export function isNodeGroup(nodeType: string): boolean {
  return nodeType.includes('labeledGroup') || nodeType.includes('ArrayGroup') || nodeType.includes('extraSourceNode')
}
export function getReactflowType(id: string, parentId: string): string {
  const isSource = parentId.includes('source-table')

  switch (true) {
    case id.includes('object'): {
      return 'labeledGroup'
    }

    case id.includes('array'): {
      return `${isSource ? 'source' : 'target'}ArrayGroup`
    }

    case id.includes('schematic'): {
      return 'extraSourceNode'
    }

    default: {
      return isSource ? 'sourceOnly' : 'targetOnly'
    }
  }
}

interface GetNodesOptions {
  typeIncludes?: string | string[]
  idIncludes?: string
  includeChecked?: boolean
  targetToIncludeOnEdit?: string
}

export function getNodesByTypeAndId(
  nodes: Node[] | null | undefined,
  options: GetNodesOptions = {},
  edges?: Edge[],
): NodeLabels[] {
  if (!nodes) return []

  let newNodes = nodes
    .filter((node) => {
      if (!options.typeIncludes) return true

      if (Array.isArray(options.typeIncludes)) return options.typeIncludes.some((type) => node.type?.includes(type))

      return node.type?.includes(options.typeIncludes)
    })
    .filter((node) => {
      if (!edges) return true

      if (node.id == options.targetToIncludeOnEdit) return true

      return !edges.some((edge) => edge.target === node.id)
    })
    .filter((node) => (options.idIncludes ? node.id.includes(options.idIncludes) : true))
    .filter((node) => node.data.isConnectable != false)
    .map(
      (node) =>
        ({
          id: node.id,
          type: node.data.variableTypeBasic,
          label: typeof node.data?.label === 'string' ? node.data.label : '',
          parentArray: recurseFindArray(node, nodes),
          ...(options.includeChecked ? { checked: node.data?.checked as boolean } : {}),
        }) as NodeLabels,
    )
  return newNodes
}
export function getUnsetNodeIds(nodes: Node[], edges: Edge[]): Set<string> {
  const unsetNodes: NodeLabels[] = getNodesByTypeAndId(nodes, { typeIncludes: 'target' }, edges)

  return new Set(unsetNodes.map((n) => n.id))
}

export function checkDuplicateLabel(
  nodes: Node[],
  parentId: string,
  label: string,
  formatType?: { duplicateKeysAllowed: boolean },
  ignoreId?: string,
) {
  if (!formatType || formatType.duplicateKeysAllowed) return

  const duplicate = nodes.some(
    (node) => node.parentId === parentId && node.data?.label === label && node.id !== ignoreId,
  )

  if (duplicate) {
    throw new Error('Duplicate property not allowed! Change property name.')
  }
}
export function generateNodeId(
  side: 'source' | 'target',
  parentId: string,
  variableType: string,
  id?: string | null,
  sourceCounter?: { current: number },
  targetCounter?: { current: number },
): string {
  if (id && id !== '') return id

  const counter = side === 'source' ? sourceCounter!.current++ : targetCounter!.current++
  return isGroup(variableType) ? `${parentId}-group-${counter}` : `${parentId}-item-${counter}`
}

export function updateNodeType(data: CustomNodeData, formatType?: FormatDefinition) {
  const updatedReactflowType = getReactflowType(data.variableType, data.parentId)
  const variableTypeBasic = formatType?.properties.find((p) => p.name === data.variableType)?.type

  return { updatedReactflowType, variableTypeBasic }
}

export function deleteNodeById(
  nodes: Node[],
  idToDelete: string,
  sequentialRepositionFn: SequentialRepositionFn,
): { updatedNodes: Node[]; deletedNode?: Node } {
  const nodeToDelete = nodes.find((node) => node.id === idToDelete)
  if (!nodeToDelete) return { updatedNodes: nodes }

  let updatedNodes = nodes.filter((node) => node.id !== idToDelete)

  if (nodeToDelete.type && isNodeGroup(nodeToDelete.type))
    updatedNodes = updatedNodes.filter((node) => !node.parentId?.startsWith(idToDelete))

  if (nodeToDelete.parentId) updatedNodes = sequentialRepositionFn(updatedNodes, nodeToDelete.parentId)

  return { updatedNodes, deletedNode: nodeToDelete }
}

export function sequentialReposition(nodes: Node[], startParentId: string, getNodeFunc: GetNodeFunc): Node[] {
  let parentId: string | null = startParentId

  while (parentId) {
    const parentNode = getNodeFunc(parentId)
    //Add the correct initial padding for the first item
    let yOffset: number = parentNode && parentNode.type && isNodeGroup(parentNode.type) ? GROUP_PADDING_TOP : ITEM_GAP

    //Get all children of parent and sort them by position
    const children = nodes
      .filter((node) => node.parentId === parentId)
      .toSorted((nodeA, nodeB) => (nodeA.position.y ?? 0) - (nodeB.position.y ?? 0))

    for (const child of children) {
      //Get height of child, or default to standard if it cannot be found
      const height: number = getNodeFunc(child.id)?.measured?.height ?? OBJECT_HEIGHT
      //Set position of child, because the children objects is a ref to nodes it also updates the  values in nodes
      child.position = { ...child.position, y: yOffset, x: parentNode?.position.x ?? 0 + ITEM_GAP }
      //Add height and padding to next child height
      yOffset += height + ITEM_GAP
    }

    //Set height for parent
    nodes = nodes.map((node) => (node.id === parentId ? { ...node, height: yOffset } : node))
    //Add padding at the bottom of a group
    //Move up one
    parentId = getNodeFunc(parentId)?.parentId ?? null
  }

  return [...nodes]
}
export function calculateNodePosition(previous: Node[], parentId: string, getNode: GetNodeFunc) {
  const futureSiblings = previous.filter((node) => node.parentId === parentId)
  const previousItem = futureSiblings.at(-1)
  const parentNode = getNode(parentId)

  let newY = 0

  if (previousItem) {
    const measuredHeight = getNode(previousItem.id)?.measured?.height ?? OBJECT_HEIGHT / 1.5

    newY += (previousItem.position.y ?? 0) + measuredHeight + ITEM_GAP
  } else if (parentNode && parentNode.type && isNodeGroup(parentNode.type)) {
    newY += GROUP_PADDING_TOP
  } else {
    newY += ITEM_GAP
  }

  return newY
}
export function generateReactFlowObject(previous: Node[], data: CustomNodeData, getNode: GetNodeFunc): Node {
  //Calculate the position the node is to be placed at. This isn't always very accurate and will be corrected later after adding
  const newY = calculateNodePosition(previous, data.parentId, getNode)
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

export function getGroupWidth(parentId: string, getNode: GetNodeFunc): number {
  const parentNode = getNode(parentId)
  if (!parentNode) {
    return GROUP_WIDTH
  }
  return ((parentNode.data.width as number) ?? GROUP_WIDTH) - ITEM_GAP * 2
}
