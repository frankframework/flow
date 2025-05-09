import type { NodeProps, Node } from '@xyflow/react'

export type GroupNode = Node<{
  label: string
  width: number
  height: number
}>

export default function GroupNodeComponent({ data, selected }: NodeProps<GroupNode>) {
  return (
    <div
      className={`pointer-events-none cursor-default rounded border bg-pink-300/25 ${selected ? 'ring-2 ring-blue-500' : ''}`}
      style={{
        width: data.width,
        height: data.height,
      }}
    >
      <div
        className="drag-handle cursor-move bg-pink-300 px-2 py-1 text-sm font-bold"
        style={{
          pointerEvents: 'all',
        }}
      >
        {data.label}
      </div>
    </div>
  )
}
