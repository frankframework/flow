import type { MappingFile, Mapping, Property, Target, MappingRow } from '~/types/datamapper_types/export-types'
import type { FlowNode, PropertyNode, MappingNode, ArrayMappingNode } from '~/types/datamapper_types/react-node-types'
import { isNodeGroup, recurseFindArray } from './property-node-utils'
import type { Edge, Node } from '@xyflow/react'
import type { MappingListConfig } from '~/types/datamapper_types/config-types'

export function convertMappingConfigToMappingFile(mappingConfig: MappingListConfig): MappingFile {
  const mappings = convertNodeToMappings(mappingConfig.propertyData.nodes as FlowNode[])
  return {
    sourceType: mappingConfig.formatTypes.source?.name ?? '',
    targetType: mappingConfig.formatTypes.target?.name ?? '',
    targetStructure: convertNodesToProperty(
      mappingConfig.propertyData.nodes as FlowNode[],
      'target-table',
      'targetOnly',
      mappings,
    ),
    sourceStructure: convertNodesToProperty(
      mappingConfig.propertyData.nodes as FlowNode[],
      'source-table',
      'sourceOnly',
    ),
  }
}

function convertNodesToProperty(
  nodes: FlowNode[],
  parentId: string,
  basicNode: string,
  mappings?: Mapping[],
): Target[] {
  return nodes
    .filter((node) => node.parentId === parentId && (node.type === basicNode || isNodeGroup(node.type)))
    .map((node) => {
      let property = nodeToProperty(node as PropertyNode, nodes)

      if (isNodeGroup(node.type)) {
        property.children = convertNodesToProperty(nodes, node.id, basicNode, mappings)
      }
      let targetProperty = property as Target
      targetProperty.isAttribute = (node.data.isAttribute as boolean) ?? false

      if (mappings)
        targetProperty.mapping = mappings.findLast((mapping) => mapping.target.internalId == property.internalId)
      return property
    })
}

function convertNodeToMappings(nodes: FlowNode[]): Mapping[] {
  return nodes
    .filter((node) => node.type === 'mappingNode' || node.type === 'arrayMappingNode')
    .map((node) => (node.type === 'mappingNode' ? nodeToMapping(nodes, node) : arrayNodeToMapping(nodes, node)))
}

function nodeToProperty(node: PropertyNode, nodes: FlowNode[]): Property {
  return {
    type: node.data.variableType ?? '',
    internalId: node.id,
    label: node.data.label ?? '',
    defaultValue: node.data.defaultValue,
    parent: node.parentId ?? '',
    parentArray: recurseFindArray(node, nodes),
  }
}

function nodeToMapping(nodes: FlowNode[], node: MappingNode): Mapping {
  const mapping: Mapping = {
    id: node.id,
    sources: [],
    target: nodeToProperty(nodes.find((n) => n.id === node.data.target) as PropertyNode, nodes),
    mutations: node.data.mutations ?? [],
    conditions: node.data.conditions ?? [],
    conditional: node.data.conditional ?? null,
    output: node.data.output,
  }

  if (node.data.sources)
    for (const id of node.data.sources) {
      const sourceNode = nodes.find((n) => n.id === id)
      if (sourceNode) {
        mapping.sources.push(nodeToProperty(sourceNode as PropertyNode, nodes))
      }
    }

  return mapping
}
function arrayNodeToMapping(nodes: FlowNode[], node: ArrayMappingNode): Mapping {
  const mapping: Mapping = {
    id: node.id,
    sources: [],
    target: nodeToProperty(nodes.find((n) => n.id === node.data.target) as PropertyNode, nodes),
    mutations: [],
    conditions: [],
    conditional: null,
    output: node.data.source,
  }

  if (node.data.source) {
    const sourceNode = nodes.find((n) => n.id === node.data.source)
    if (sourceNode) {
      mapping.sources.push(nodeToProperty(sourceNode as PropertyNode, nodes))
    }
  }

  return mapping
}

export function flowToMappingTable(nodes: Node[], edges: Edge[]): MappingRow[] {
  const nodeMap = new Map<string, Node>(nodes.map((node) => [node.id, node]))

  const getLabel = (nodeId: string): string => {
    const label = nodeMap.get(nodeId)?.data?.label
    return typeof label === 'string' ? label : nodeId
  }

  return nodes
    .filter((node): node is MappingNode => node.type === 'mappingNode')
    .map((mappingNode): MappingRow => {
      const incomingEdges = edges.filter((edge) => edge.target === mappingNode.id)
      const outgoingEdges = edges.filter((edge) => edge.source === mappingNode.id)

      const mutations = mappingNode.data?.mutations ?? []
      const conditions = mappingNode.data?.conditions ?? []
      const conditional = mappingNode.data?.conditional ?? null

      return {
        id: mappingNode.id,
        sourcesNames: incomingEdges.map((edge) => getLabel(edge.source)),
        targetsNames: outgoingEdges.map((edge) => getLabel(edge.target)),
        type: mappingNode.data?.type ?? 'one-to-one',
        mutations,
        conditions,
        conditional,
        outputLabel: mappingNode.data.outputLabel ?? '',
      }
    })
}
