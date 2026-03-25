import type { Edge, Node } from '@xyflow/react'
import { getConnectedNodes, getNodeAndChildren } from './generic-node-utils'

export function getHighlightedFromMappingNode(edges: Edge[], id: string): Set<string> {
  const highlightedNodes = new Set<string>()

  for (const edge of edges) {
    if (edge.id.includes(id)) {
      highlightedNodes.add(edge.source)
      highlightedNodes.add(edge.target)
    }
  }

  return highlightedNodes
}

export function getHighlightedFromPropertyNode(nodes: Node[], edges: Edge[], nodeId: string): Set<string> {
  const nodeIds = getNodeAndChildren(nodes, nodeId)

  const firstHop = getConnectedNodes(edges, nodeIds)
  const secondHop = getConnectedNodes(edges, firstHop, nodeIds)

  return new Set([...nodeIds, ...firstHop, ...secondHop])
}
export function applyHighlightToElements(
  nodes: Node[],
  edges: Edge[],
  highlightedNodes: Set<string>,
): { nodes: Node[]; edges: Edge[] } {
  const updatedEdges = edges.map((edge) => {
    const isHighlighted = highlightedNodes.has(edge.source) && highlightedNodes.has(edge.target)

    return {
      ...edge,
      style: {
        ...edge.style,
        opacity: isHighlighted ? 1 : 0.01,
      },
      animated: isHighlighted,
    }
  })

  const updatedNodes = nodes.map((node) => ({
    ...node,
    style: {
      ...node.style,
      opacity: highlightedNodes.has(node.id) ? 1 : 0.2,
    },
  }))

  return { nodes: updatedNodes, edges: updatedEdges }
}
export function resetHighlightElements(nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[] } {
  return {
    edges: edges.map((edge) => ({
      ...edge,
      style: { ...edge.style, opacity: 1 },
      animated: false,
    })),
    nodes: nodes.map((node) => ({
      ...node,
      style: {
        ...node.style,
        opacity: 1,
        borderWidth: 0,
        borderColor: 'none',
      },
    })),
  }
}
export function applyUnsetHighlightToNodes(nodes: Node[], unsetNodeIds: Set<string>): Node[] {
  return nodes.map((node) => {
    const isUnset = unsetNodeIds.has(node.id)

    return {
      ...node,
      style: {
        ...node.style,
        borderColor: isUnset ? (node.data.defaultValue ? 'yellow' : 'red') : 'none',
        borderWidth: isUnset ? 3 : 0,
      },
    }
  })
}
