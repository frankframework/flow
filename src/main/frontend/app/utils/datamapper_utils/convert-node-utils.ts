import type { MappingListConfig, MappingFile, Mapping, Property, Target } from '~/types/datamapper_types/config-types'
import type { FlowNode, PropertyNode, MappingNode, ArrayMappingNode } from '~/types/datamapper_types/node-types'
import { isNodeGroup, recurseFindArray } from './react-node-utils'

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
