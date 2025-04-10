import { Handle, type Node, Position } from '@xyflow/react'

export type StartNode = Node<{}>
export default function StartNode() {
  return (
    <>
      <div className="bg h-[10px] w-[10px] rounded-full" style={{ backgroundColor: 'var(--color-indigo-600)' }}></div>
      <Handle type={'source'} position={Position.Right} className="invisible"></Handle>
    </>
  )
}
