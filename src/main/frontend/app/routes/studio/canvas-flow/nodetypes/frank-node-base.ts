import type { Node } from '@xyflow/react'

export type FrankNodeData = {
  nodeType: string
}

export type FrankNodeBase<Data extends FrankNodeData = FrankNodeData> = Node<Data>
export type ResizableFrankNodeBase<Data extends FrankNodeData = FrankNodeData> = FrankNodeBase<Data> & {
  width?: number
  height?: number
}

export function isNodeType<T extends FrankNodeBase>(node: Node, nodeType: string): node is T {
  return node.data.nodeType === nodeType
}
