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

export function getNodesByTypeAndId(nodes: Node[] | null | undefined, options: GetNodesOptions = {}): NodeLabels[] {
  if (!nodes) return []
  let newNodes = nodes
    .filter((n) => {
      if (!options.typeIncludes) return true

      if (Array.isArray(options.typeIncludes)) {
        return options.typeIncludes.some((type) => n.type?.includes(type))
      }

      return n.type?.includes(options.typeIncludes)
    })
    .filter((n) => (options.idIncludes ? n.id.includes(options.idIncludes) : true))
    .map(
      (n) =>
        ({
          id: n.id,
          type: n.data.variableTypeBasic,
          label: typeof n.data?.label === 'string' ? n.data.label : '',
          ...(options.includeChecked ? { checked: n.data?.checked as boolean } : {}),
        }) as NodeLabels,
    )
  return newNodes
}

export interface MappingNodeResult {
  updatedNodes: Node[]
  updatedEdges: Edge[]
}

function getNodeCenter(sources: string[], target: string, allNodes: Node[]): { x: number; y: number } {
  //This function currently only gets the relative coordinates of the items in the parent. If it's in an object it will not add the parent object's coordinates
  let x = 0
  let y = 0
  let count = 0

  for (const nodeId of sources) {
    let node = allNodes.find((n) => n.id === nodeId)
    if (node) {
      y += node.position.y
      count++
      addParentPosition(node)
    }
  }

  let node = allNodes.find((n) => n.id === target)
  if (node) {
    y += node.position.y
    count++
    addParentPosition(node)
  }

  function addParentPosition(node: Node) {
    if (node.parentId?.endsWith('table')) {
      return
    }
    const parentNode = allNodes.find((n) => n.id == node.parentId)
    if (parentNode != null) {
      y += parentNode.position?.y
      addParentPosition(parentNode)
    }
  }
  let sourceNode = allNodes.find((n) => n.id == 'source-table')
  let targetNode = allNodes.find((n) => n.id == 'target-table')

  if (sourceNode) x += sourceNode.position.x
  if (targetNode) x += targetNode.position.x
  return { x: x / 1.8, y: y / count }
}

export function createMappingNode(
  mappingConfig: MappingConfig,
  allNodes: Node[] = [],
  allEdges: Edge[],
): MappingNodeResult {
  let updatedNodes: Node[]
  if (mappingConfig.id) {
    updatedNodes = allNodes.map((n) =>
      n.id === mappingConfig.id
        ? {
            ...n,

            data: mappingConfig,
          }
        : n,
    )

    allEdges = allEdges.filter((edge) => edge.source !== mappingConfig.id && edge.target !== mappingConfig.id)
  } else {
    const id = `mapping-${Math.random().toString(36).slice(2)}`
    const colour = `#${Math.floor(Math.random() * 16_777_215)
      .toString(16)
      .padStart(6, '0')}`
    mappingConfig.colour = colour
    mappingConfig.id = id

    const position = getNodeCenter(mappingConfig.sources, mappingConfig.target, allNodes)

    let overlap = true
    while (overlap) {
      overlap = false
      for (const node of allNodes) {
        if (node.type === 'mappingNode') {
          const distance = Math.abs(node.position.y - position.y)
          if (distance < 40) {
            position.y += 50
            overlap = true
            break
          }
        }
      }
    }

    allNodes.push({
      id,
      parentId: 'mapping-table',
      type: 'mappingNode',
      position: { x: 0, y: position.y },
      data: mappingConfig,
    })
    updatedNodes = allNodes
  }
  const updatedEdges = [...allEdges, ...createEdges(mappingConfig)]
  return { updatedNodes, updatedEdges }
}

function createEdges(mappingConfig: MappingConfig) {
  const newEdges: Edge[] = []

  for (const sourceId of mappingConfig.sources) {
    newEdges.push({
      id: `${sourceId}-${mappingConfig.id}`,
      source: sourceId,
      target: mappingConfig.id ?? '',
      style: { stroke: mappingConfig.colour, strokeWidth: 2 },
      selectable: true,
      data: { hidden: false },
    })
  }

  newEdges.push({
    id: `${mappingConfig.id}-${mappingConfig.target}`,
    source: mappingConfig.id ?? '',
    target: mappingConfig.target,
    style: { stroke: mappingConfig.colour, strokeWidth: 2 },
    selectable: true,
    data: { hidden: false },
  })

  return newEdges
}

export function deleteMappingNode(nodeId: string, allNodes: Node[], allEdges: Edge[]): DeleteMappingNodeResult {
  // Filter out the mapping node itself
  const remainingNodes = allNodes.filter((node) => node.id !== nodeId)

  // Filter out edges connected to the mapping node
  const remainingEdges = allEdges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)

  return { remainingNodes, remainingEdges }
}
