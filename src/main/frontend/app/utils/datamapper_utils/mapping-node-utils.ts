import type { Node, Edge } from '@xyflow/react'
import type { NodeLabels, MappingNodeData, ArrayNodeData } from '~/types/datamapper_types/react-node-types'
import { findNodeById } from './generic-node-utils'
import { getNodesByTypeAndId } from './property-node-utils'

export type DeleteMappingNodeResult = {
  remainingNodes: Node[]
  remainingEdges: Edge[]
}

export type MappingNodeResult = {
  updatedNodes: Node[]
  updatedEdges: Edge[]
}
type MappingEdgeInput = {
  id: string
  sources: string[]
  target: string
  colour: string
}

function removeEdgesForNode(nodeId: string, allEdges: Edge[]): Edge[] {
  return allEdges.filter((edge): boolean => edge.source !== nodeId && edge.target !== nodeId)
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
  const relatedNodes = [
    ...sourceIds.map((id): Node | undefined => findNodeById(id, allNodes)),
    findNodeById(targetId, allNodes),
  ].filter(Boolean) as Node[]

  const averageY =
    relatedNodes.reduce((sum, node): number => sum + getMappingHeightPosition(node, allNodes), 0) /
    (relatedNodes.length || 1)

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

function createMappingId(): string {
  return `mapping-${Math.random().toString(36).slice(2)}`
}

function createRandomColour(): string {
  return `#${Math.floor(Math.random() * 16_777_215)
    .toString(16)
    .padStart(6, '0')}`
}

function buildMappingEdges({ id, sources, target, colour }: MappingEdgeInput): Edge[] {
  return [
    ...sources.map(
      (
        sourceId,
      ): {
        id: string
        source: string
        target: string
        style: { stroke: string; strokeWidth: number }
        selectable: boolean
        data: { hidden: boolean }
      } => ({
        id: `${sourceId}-${id}`,
        source: sourceId,
        target: id!,
        style: { stroke: colour, strokeWidth: 2 },
        selectable: true,
        data: { hidden: false },
      }),
    ),
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
  const updatedNodes = allNodes.map((node): Node =>
    node.id === mappingConfig.id ? { ...node, data: mappingConfig } : node,
  )

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
    remainingNodes: allNodes.filter((node): boolean => node.id !== nodeId),
    remainingEdges: removeEdgesForNode(nodeId, allEdges),
  }
}

export function getMappingNodes(
  nodes: Node[],
  edges: Edge[],
  mappingConfig?: MappingNodeData,
): { sources: NodeLabels[]; targets: NodeLabels[]; unfilteredSources: NodeLabels[] } {
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

  const sources = unfilteredSources.filter((s): boolean => s.parentArray == undefined)

  let parentArrayId = targets.find((t): boolean | undefined => t.checked)?.parentArray
  if (mappingConfig) {
    parentArrayId = targets.find((t): boolean => t.id == mappingConfig.target)?.parentArray
  }
  if (parentArrayId) {
    const arrayMapping = nodes.find((n): boolean => n.data.target == parentArrayId)

    if (arrayMapping) {
      sources.push(...unfilteredSources.filter((s): boolean => s.parentArray == arrayMapping.data.source))
    }
  }

  return { sources, targets, unfilteredSources }
}

export function validateMapping(
  sources: NodeLabels[],
  targets: NodeLabels[],
  unfilteredSources: NodeLabels[],
): string | null {
  const checkedSources = sources.filter((labels): boolean | undefined => labels.checked)
  if (checkedSources.length !== unfilteredSources.filter((labels): boolean | undefined => labels.checked).length) {
    return 'Mapping item in source array only allowed within a for each'
  }

  const checkedTargets = targets.filter((labels): boolean | undefined => labels.checked)
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
): boolean {
  const arraySources = checkedSources.filter((s): boolean | undefined => s.type?.includes('array'))

  const isTargetArray = checkedTargets[0]?.type?.includes('array')

  if (isTargetArray && arraySources.length === checkedSources.length) {
    const config = {
      source: checkedSources[0].id,
      target: checkedTargets[0].id,
    }

    const { updatedNodes, updatedEdges } = createNewArrayMappingNode(config, nodes, edges)

    setNodes(updatedNodes)
    setEdges(updatedEdges)

    return true
  }

  if (isTargetArray || arraySources.length > 0) {
    throw new Error('Invalid mapping configuration, arrays cannot be mapped with normal properties')
  }

  return false
}
