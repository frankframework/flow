import type { MappingListConfig, MappingFile, Mapping, Property, Target } from '~/types/datamapper_types/config-types'
import type { FlowNode, PropertyNode, MappingNode } from '~/types/datamapper_types/node-types'

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
  }
}

function convertNodesToProperty(nodes: FlowNode[], parentId: string, basicNode: string, mappings: Mapping[]): Target[] {
  return nodes
    .filter(
      (node) =>
        node.parentId === parentId &&
        (node.type === basicNode || node.type === 'labeledGroup' || node.type === 'extraSourceNode'),
    )
    .map((node) => {
      let property = nodeToProperty(node as PropertyNode)

      if (node.type === 'labeledGroup') {
        property.children = convertNodesToProperty(nodes, node.id, basicNode, mappings)
      }
      let targetProperty = property as Target
      targetProperty.mapping = mappings.findLast((mapping) => mapping.target.internalId == property.internalId)
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
    target: nodeToProperty(nodes.find((n) => n.id === node.data.target) as PropertyNode),
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

  return mapping
}
