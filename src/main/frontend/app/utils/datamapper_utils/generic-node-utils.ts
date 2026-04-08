import type { Node, Edge } from '@xyflow/react'
import { isNodeGroup } from './property-node-utils'

export function findNodeById(nodeId: string, allNodes: Node[]): Node | undefined {
  return allNodes.find((node) => node.id === nodeId)
}
export function findNodeParent(node: Node, allNodes: Node[]): Node | undefined {
  return allNodes.find((parent) => parent.id == node.parentId)
}
export function getNodeAndChildren(nodes: Node[], nodeId: string): Set<string> {
  const node = nodes.find((n) => n.id === nodeId)
  if (node && node.type) {
    return isNodeGroup(node.type)
      ? new Set(nodes.filter((n) => n.parentId === nodeId).flatMap((n) => [...getNodeAndChildren(nodes, n.id)])).add(
          nodeId,
        )
      : new Set([nodeId, node.parentId ?? ''])
  }

  return new Set([nodeId])
}

export function getConnectedNodes(
  edges: Edge[],
  from: Set<string>,
  exclude: Set<string> = new Set<string>(),
): Set<string> {
  const result = new Set<string>()

  for (const { source, target } of edges) {
    if (from.has(source) && !exclude.has(target)) result.add(target)
    if (from.has(target) && !exclude.has(source)) result.add(source)
  }

  return result
}
