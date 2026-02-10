import type { MappingListConfig, MappingFile, Mapping, Property } from '~/types/datamapper_types/config-types'
import type { FlowNode, PropertyNode, MappingNode } from '~/types/datamapper_types/node-types'

export function convertMappingConfigToMappingFile(mappingConfig: MappingListConfig): MappingFile {
  return {
    sourceType: mappingConfig.formatTypes.source?.name ?? '',
    targetType: mappingConfig.formatTypes.target?.name ?? '',
    sourceStructure: convertNodesToProperty(
      mappingConfig.propertyData.nodes as FlowNode[],
      'source-table',
      'sourceOnly',
    ),
    targetStructure: convertNodesToProperty(
      mappingConfig.propertyData.nodes as FlowNode[],
      'target-table',
      'targetOnly',
    ),
    mappings: convertNodeToMappings(mappingConfig.propertyData.nodes as FlowNode[]),
  }
}

function convertNodesToProperty(nodes: FlowNode[], parentId: string, basicNode: string): Property[] {
  return nodes
    .filter(
      (node) =>
        node.parentId === parentId &&
        (node.type === basicNode || node.type === 'labeledGroup' || node.type === 'extraSourceNode'),
    )
    .map((node) => {
      let property = nodeToProperty(node as PropertyNode)

      if (node.type === 'labeledGroup') {
        property.children = convertNodesToProperty(nodes, node.id, basicNode)
      }

      return property
    })
}

function convertNodeToMappings(nodes: FlowNode[]): Mapping[] {
  return nodes.filter((node) => node.type === 'mappingNode').map((node) => nodeToMapping(nodes, node))
}

function nodeToProperty(node: PropertyNode): Property {
  return {
    type: node.data.variableType ?? '',
    internalId: node.id,
    label: node.data.label ?? '',
    defaultValue: node.data.defaultValue,
    parent: node.parentId ?? '',
  }
}

function nodeToMapping(nodes: FlowNode[], node: MappingNode): Mapping {
  const mapping: Mapping = {
    id: node.id,
    sources: [],
    targets: [],
    mutations: node.data.mutations ?? [],
    conditions: node.data.conditions ?? [],
    conditional: node.data.conditional ?? null,
    output: node.data.output,
  }

  if (node.data.sources)
    for (const id of node.data.sources) {
      const sourceNode = nodes.find((n) => n.id === id)
      if (sourceNode) {
        mapping.sources.push(nodeToProperty(sourceNode as PropertyNode))
      }
    }

  const targetNode = nodes.find((n) => n.id === node.data.target)
  if (targetNode) {
    mapping.targets.push(nodeToProperty(targetNode as PropertyNode))
  }

  return mapping
}
