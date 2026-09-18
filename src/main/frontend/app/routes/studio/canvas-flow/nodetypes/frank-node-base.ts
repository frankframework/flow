import type { Node } from '@xyflow/react'

export type FrankNodeData = {
  nodeType: string
}

export type FrankNodeBase<Data extends FrankNodeData> = Node<Data>
export type ResizableFrankNodeBase<Data extends FrankNodeData> = FrankNodeBase<Data> & {
  width?: number
  height?: number
}
