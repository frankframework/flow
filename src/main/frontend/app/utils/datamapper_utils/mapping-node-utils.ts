import type { Node, Edge } from '@xyflow/react'
import type { NodeLabels, MappingNodeData, ArrayNodeData } from '~/types/datamapper_types/react-node-types'
import { findNodeById } from './generic-node-utils'
import { getNodesByTypeAndId } from './property-node-utils'

export interface DeleteMappingNodeResult {
  remainingNodes: Node[]
  remainingEdges: Edge[]
}

export interface MappingNodeResult {
  updatedNodes: Node[]
  updatedEdges: Edge[]
}
interface MappingEdgeInput {
  id: string
  sources: string[]
  target: string
  colour: string
}

function removeEdgesForNode(nodeId: string, allEdges: Edge[]): Edge[] {
  return allEdges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)
}

function getMappingHeightPosition(node: Node, allNodes: Node[]): number {
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

function calculateCenterPositionFromNodes(
  sourceIds: string[],
  targetId: string,
  allNodes: Node[],
): { x: number; y: number } {
  const relatedNodes = [...sourceIds.map((id) => findNodeById(id, allNodes)), findNodeById(targetId, allNodes)].filter(
    Boolean,
  ) as Node[]

  const averageY =
    relatedNodes.reduce((sum, node) => sum + getMappingHeightPosition(node, allNodes), 0) / (relatedNodes.length || 1)

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
      if (!node.type?.toLocaleLowerCase().includes('mappingnode')) continue

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

function buildMappingEdges({ id, sources, target, colour }: MappingEdgeInput): Edge[] {
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
  mappingConfig: MappingNodeData,
  allNodes: Node[] = [],
  allEdges: Edge[],
): MappingNodeResult {
  return mappingConfig.id
    ? updateExistingMappingNode(mappingConfig, allNodes, allEdges)
    : createNewMappingNode(mappingConfig, allNodes, allEdges)
}

function updateExistingMappingNode(
  mappingConfig: MappingNodeData,
  allNodes: Node[],
  allEdges: Edge[],
): MappingNodeResult {
  const updatedNodes = allNodes.map((node) => (node.id === mappingConfig.id ? { ...node, data: mappingConfig } : node))

  const cleanedEdges = removeEdgesForNode(mappingConfig.id!, allEdges)
  const mappingEdgeInput: MappingEdgeInput = {
    id: mappingConfig.id ?? '',
    colour: mappingConfig.colour ?? '',
    sources: mappingConfig.sources,
    target: mappingConfig.target,
  }
  return {
    updatedNodes,
    updatedEdges: [...cleanedEdges, ...buildMappingEdges(mappingEdgeInput)],
  }
}

function createNewMappingNode(mappingConfig: MappingNodeData, allNodes: Node[], allEdges: Edge[]): MappingNodeResult {
  const id = createMappingId()
  const colour = createRandomColour()

  const newMappingConfig: MappingNodeData = {
    ...mappingConfig,
    id,
    colour,
  }

  const centerPosition = calculateCenterPositionFromNodes(newMappingConfig.sources, newMappingConfig.target, allNodes)

  const resolvedY = resolveVerticalOverlap(centerPosition.y, allNodes)

  const newNode: Node = {
    id,
    parentId: 'mapping-table',
    type: 'mappingNode',
    position: { x: 0, y: resolvedY },
    data: newMappingConfig,
  }
  const mappingEdgeInput: MappingEdgeInput = {
    id,
    colour,
    sources: mappingConfig.sources,
    target: mappingConfig.target,
  }
  return {
    updatedNodes: [...allNodes, newNode],
    updatedEdges: [...allEdges, ...buildMappingEdges(mappingEdgeInput)],
  }
}

export function createNewArrayMappingNode(
  mappingConfig: ArrayNodeData,
  allNodes: Node[],
  allEdges: Edge[],
): MappingNodeResult {
  const id = createMappingId()

  mappingConfig.colour = createRandomColour()

  const mappingEdgeInput: MappingEdgeInput = {
    id,
    colour: mappingConfig.colour,
    sources: [mappingConfig.source],
    target: mappingConfig.target,
  }

  const centerPosition = calculateCenterPositionFromNodes([mappingConfig.source], mappingConfig.target, allNodes)

  const resolvedY = resolveVerticalOverlap(centerPosition.y, allNodes)

  const newNode: Node = {
    id,
    parentId: 'mapping-table',
    type: 'arrayMappingNode',
    position: { x: 0, y: resolvedY },
    data: mappingConfig,
  }
  return {
    updatedNodes: [...allNodes, newNode],
    updatedEdges: [...allEdges, ...buildMappingEdges(mappingEdgeInput)],
  }
}

export function deleteMappingNode(nodeId: string, allNodes: Node[], allEdges: Edge[]): DeleteMappingNodeResult {
  return {
    remainingNodes: allNodes.filter((node) => node.id !== nodeId),
    remainingEdges: removeEdgesForNode(nodeId, allEdges),
  }
}

export function getMappingNodes(nodes: Node[], edges: Edge[], mappingConfig?: MappingNodeData) {
  const unfilteredSources = getNodesByTypeAndId(
    nodes,
    {
      typeIncludes: 'source',
      includeChecked: true,
    },
    edges,
  )

  const targets = getNodesByTypeAndId(
    nodes,
    {
      typeIncludes: 'target',
      includeChecked: true,
      targetToIncludeOnEdit: mappingConfig?.target,
    },
    edges,
  )

  const sources = unfilteredSources.filter((s) => s.parentArray == undefined)

  let parentArrayId = targets.find((t) => t.checked)?.parentArray
  if (mappingConfig) {
    parentArrayId = targets.find((t) => t.id == mappingConfig.target)?.parentArray
  }
  if (parentArrayId) {
    const arrayMapping = nodes.find((n) => n.data.target == parentArrayId)

    if (arrayMapping) {
      sources.push(...unfilteredSources.filter((s) => s.parentArray == arrayMapping.data.source))
    }
  }

  return { sources, targets, unfilteredSources }
}

export function validateMapping(sources: NodeLabels[], targets: NodeLabels[], unfilteredSources: NodeLabels[]) {
  const checkedSources = sources.filter((s) => s.checked)
  const checkedTargets = targets.filter((t) => t.checked)

  if (checkedSources.length !== unfilteredSources.filter((s) => s.checked).length) {
    return 'Mapping item in source array only allowed within a for each'
  }

  if (checkedSources.length > 1 && checkedTargets.length > 1) {
    return 'Many to Many mapping not supported!'
  }

  return null
}

export function handleArrayMapping(
  checkedSources: NodeLabels[],
  checkedTargets: NodeLabels[],
  nodes: Node[],
  edges: Edge[],
  setNodes: (nodes: Node[]) => void,
  setEdges: (edges: Edge[]) => void,
) {
  const arraySources = checkedSources.filter((s) => s.type?.includes('array'))

  const isTargetArray = checkedTargets[0]?.type?.includes('array')

  if (arraySources.length === checkedSources.length && isTargetArray) {
    const config = {
      source: checkedSources[0].id,
      target: checkedTargets[0].id,
    }

    const { updatedNodes, updatedEdges } = createNewArrayMappingNode(config, nodes, edges)

    setNodes(updatedNodes)
    setEdges(updatedEdges)

    return true
  }

  if (arraySources.length > 0 || isTargetArray) {
    throw new Error('Invalid mapping configuration, arrays cannot be mapped with normal properties')
  }

  return false
}
