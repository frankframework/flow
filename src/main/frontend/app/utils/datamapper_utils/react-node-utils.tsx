import type { Node, Edge } from '@xyflow/react'
import type { NodeLabels, MappingConfig } from '~/types/datamapper_types/node-types'

interface GetNodesOptions {
  typeIncludes?: string | string[]
  idIncludes?: string
  includeChecked?: boolean
}

export interface DeleteMappingNodeResult {
  remainingNodes: Node[]
  remainingEdges: Edge[]
}

export interface MappingNodeResult {
  updatedNodes: Node[]
  updatedEdges: Edge[]
}

export function getNodesByTypeAndId(nodes: Node[] | null | undefined, options: GetNodesOptions = {}): NodeLabels[] {
  if (!nodes) return []

  let newNodes = nodes
    .filter((node) => {
      if (!options.typeIncludes) return true

      if (Array.isArray(options.typeIncludes)) {
        return options.typeIncludes.some((type) => node.type?.includes(type))
      }

      return node.type?.includes(options.typeIncludes)
    })
    .filter((node) => (options.idIncludes ? node.id.includes(options.idIncludes) : true))
    .map(
      (node) =>
        ({
          id: node.id,
          type: node.data.variableTypeBasic,
          label: typeof node.data?.label === 'string' ? node.data.label : '',
          ...(options.includeChecked ? { checked: node.data?.checked as boolean } : {}),
        }) as NodeLabels,
    )
  return newNodes
}

function findNodeById(nodeId: string, allNodes: Node[]): Node | undefined {
  return allNodes.find((node) => node.id === nodeId)
}

function removeEdgesForNode(nodeId: string, allEdges: Edge[]): Edge[] {
  return allEdges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)
}

function getNodeAbsoluteY(node: Node, allNodes: Node[]): number {
  let y = node.position.y
  let currentNode: Node | undefined = node

  while (currentNode?.parentId) {
    currentNode = findNodeById(currentNode.parentId, allNodes)
    if (currentNode) {
      y += currentNode.position.y
    }
  }

  return y
}

function calculateMappingCenter(sourceIds: string[], targetId: string, allNodes: Node[]): { x: number; y: number } {
  const relatedNodes = [...sourceIds.map((id) => findNodeById(id, allNodes)), findNodeById(targetId, allNodes)].filter(
    Boolean,
  ) as Node[]

  const averageY =
    relatedNodes.reduce((sum, node) => sum + getNodeAbsoluteY(node, allNodes), 0) / (relatedNodes.length || 1)

  const sourceTableX = findNodeById('source-table', allNodes)?.position.x ?? 0
  const targetTableX = findNodeById('target-table', allNodes)?.position.x ?? 0

  return {
    x: (sourceTableX + targetTableX) / 1.8,
    y: averageY,
  }
}

function resolveVerticalOverlap(desiredY: number, allNodes: Node[], minDistance = 40, offset = 50): number {
  let y = desiredY
  let hasOverlap = true

  while (hasOverlap) {
    hasOverlap = false

    for (const node of allNodes) {
      if (node.type !== 'mappingNode') continue

      if (Math.abs(node.position.y - y) < minDistance) {
        y += offset
        hasOverlap = true
        break
      }
    }
  }

  return y
}

function createMappingId() {
  return `mapping-${Math.random().toString(36).slice(2)}`
}

function createRandomColour() {
  return `#${Math.floor(Math.random() * 16_777_215)
    .toString(16)
    .padStart(6, '0')}`
}

function buildMappingEdges(mappingConfig: MappingConfig): Edge[] {
  const { id, sources, target, colour } = mappingConfig

  return [
    ...sources.map((sourceId) => ({
      id: `${sourceId}-${id}`,
      source: sourceId,
      target: id!,
      style: { stroke: colour, strokeWidth: 2 },
      selectable: true,
      data: { hidden: false },
    })),
    {
      id: `${id}-${target}`,
      source: id!,
      target,
      style: { stroke: colour, strokeWidth: 2 },
      selectable: true,
      data: { hidden: false },
    },
  ]
}

export function createMappingNode(
  mappingConfig: MappingConfig,
  allNodes: Node[] = [],
  allEdges: Edge[],
): MappingNodeResult {
  return mappingConfig.id
    ? updateExistingMappingNode(mappingConfig, allNodes, allEdges)
    : createNewMappingNode(mappingConfig, allNodes, allEdges)
}

function updateExistingMappingNode(
  mappingConfig: MappingConfig,
  allNodes: Node[],
  allEdges: Edge[],
): MappingNodeResult {
  const updatedNodes = allNodes.map((node) => (node.id === mappingConfig.id ? { ...node, data: mappingConfig } : node))

  const cleanedEdges = removeEdgesForNode(mappingConfig.id!, allEdges)

  return {
    updatedNodes,
    updatedEdges: [...cleanedEdges, ...buildMappingEdges(mappingConfig)],
  }
}

function createNewMappingNode(mappingConfig: MappingConfig, allNodes: Node[], allEdges: Edge[]): MappingNodeResult {
  const id = createMappingId()
  const colour = createRandomColour()

  const newMappingConfig: MappingConfig = {
    ...mappingConfig,
    id,
    colour,
  }

  const centerPosition = calculateMappingCenter(newMappingConfig.sources, newMappingConfig.target, allNodes)

  const resolvedY = resolveVerticalOverlap(centerPosition.y, allNodes)

  const newNode: Node = {
    id,
    parentId: 'mapping-table',
    type: 'mappingNode',
    position: { x: 0, y: resolvedY },
    data: newMappingConfig,
  }

  return {
    updatedNodes: [...allNodes, newNode],
    updatedEdges: [...allEdges, ...buildMappingEdges(newMappingConfig)],
  }
}

export function deleteMappingNode(nodeId: string, allNodes: Node[], allEdges: Edge[]): DeleteMappingNodeResult {
  return {
    remainingNodes: allNodes.filter((node) => node.id !== nodeId),
    remainingEdges: removeEdgesForNode(nodeId, allEdges),
  }
}
