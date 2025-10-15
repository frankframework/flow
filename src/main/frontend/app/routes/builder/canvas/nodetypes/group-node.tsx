import { type Node, type NodeProps, NodeResizeControl } from '@xyflow/react'
import { useState } from 'react'
import { ResizeIcon } from '~/routes/builder/canvas/nodetypes/frank-node'

export type GroupNode = Node<{
  label: string
  width: number
  height: number
}>

export default function GroupNodeComponent({ data, selected }: NodeProps<GroupNode>) {
  const [dimensions, setDimensions] = useState({
    width: data.width,
    height: data.height,
  })
  const [isEditing, setIsEditing] = useState(false)
  const [label, setLabel] = useState(data.label)

  const handleBlur = () => setIsEditing(false)
  const handleClick = () => setIsEditing(true)

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleBlur()
    }
  }

  return (
    <>
      <NodeResizeControl
        onResize={(event, resizeData) => {
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
        className="pointer-events-none cursor-default rounded border bg-pink-300/25"
        style={{
          width: dimensions.width,
          height: dimensions.height,
        }}
      >
        <div
          className="drag-handle relative max-h-1/2 cursor-move bg-pink-300 p-1"
          style={{
            pointerEvents: 'all',
          }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <HamburgerMenu />
          </div>
          <div className="flex max-w-1/2 gap-1 px-2 py-1 text-sm font-bold">
            {isEditing ? (
              <input
                type="text"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                autoFocus
                className="nodrag rounded border px-1 text-sm"
              />
            ) : (
              <>
                <div className="cursor-pointer" onClick={handleClick}>
                  {label}
                </div>
                <div onClick={handleClick} className="flex-shrink-0 cursor-pointer self-start">
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
