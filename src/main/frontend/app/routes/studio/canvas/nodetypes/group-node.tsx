import { type Node, type NodeProps, NodeResizeControl } from '@xyflow/react'
import { useState, type ChangeEvent } from 'react'
import { ResizeIcon } from '~/routes/studio/canvas/nodetypes/frank-node'
import useFlowStore from '~/stores/flow-store'

export const GROUP_COLORS = [
  { label: 'Blue', value: 'var(--group-color-blue)' },
  { label: 'Violet', value: 'var(--group-color-violet)' },
  { label: 'Rose', value: 'var(--group-color-rose)' },
  { label: 'Green', value: 'var(--group-color-green)' },
  { label: 'Amber', value: 'var(--group-color-amber)' },
  { label: 'Cyan', value: 'var(--group-color-cyan)' },
]

export const GROUP_DEFAULT_COLOR = 'var(--group-color-blue)'

export type GroupNode = Node<{
  label: string
  description?: string
  color?: string
  width: number
  height: number
  childrenNames?: string[]
}>

export default function GroupNodeComponent({ id, data, selected }: NodeProps<GroupNode>) {
  const [dimensions, setDimensions] = useState({
    width: data.width,
    height: data.height,
  })
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')

  const color = data.color || GROUP_DEFAULT_COLOR

  const handleStartEdit = () => {
    setEditValue(data.label)
    setIsEditing(true)
  }

  const handleBlur = () => setIsEditing(false)

  const handleSave = (event: ChangeEvent<HTMLInputElement>) => {
    setEditValue(event.target.value)
    useFlowStore.getState().setGroupnodeLabel(id, event.target.value)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleBlur()
    }
  }

  return (
    <>
      <NodeResizeControl
        onResize={(_event, resizeData) => {
          setDimensions({
            width: resizeData.width,
            height: resizeData.height,
          })
        }}
        style={{ background: 'transparent', border: 'none' }}
      >
        <ResizeIcon color="black" />
      </NodeResizeControl>
      <div
        className={`cursor-default rounded border ${selected ? 'border-blue-500' : 'border-border'}`}
        style={{
          width: dimensions.width,
          height: dimensions.height,
          backgroundColor: `color-mix(in srgb, ${color} 25%, transparent)`,
        }}
      >
        <div
          className="drag-handle relative max-h-1/2 cursor-move p-1"
          style={{
            pointerEvents: 'all',
            backgroundColor: color,
          }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <HamburgerMenu />
          </div>

          <div className="flex max-w-1/2 gap-1 px-2 py-1 text-sm font-bold">
            {isEditing ? (
              <input
                type="text"
                value={editValue}
                onChange={handleSave}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                autoFocus
                className="nodrag rounded border px-1 text-sm"
              />
            ) : (
              <>
                <div className="cursor-pointer" onClick={handleStartEdit}>
                  {data.label}
                </div>
                <div onClick={handleStartEdit} className="flex-shrink-0 cursor-pointer self-start">
                  <PenIcon />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function HamburgerMenu() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="ml-2 h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <line x1="4" y1="6" x2="20" y2="6" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="4" y1="12" x2="20" y2="12" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="4" y1="18" x2="20" y2="18" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PenIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="ml-2 h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11 5H6a2 2 0 00-2 2v11.5A1.5 1.5 0 005.5 20H17a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
      />
    </svg>
  )
}
