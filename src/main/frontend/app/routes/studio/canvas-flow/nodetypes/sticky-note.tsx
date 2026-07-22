import { type Node, type NodeProps, NodeResizeControl, useUpdateNodeInternals } from '@xyflow/react'
import { FlowConfig } from '~/routes/studio/canvas-flow/flow.config'
import { ResizeIcon } from '~/routes/studio/canvas-flow/nodetypes/frank-node'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import useFlowStore from '~/stores/flow-store'
import { useNodeContextMenu } from '~/routes/studio/canvas-flow/node-context-menu-context'
import useNodeContextStore from '~/stores/node-context-store'

export const STICKY_NOTE_COLORS = [
  { label: 'Yellow', value: 'var(--sticky-color-yellow)' },
  { label: 'Blue', value: 'var(--sticky-color-blue)' },
  { label: 'Green', value: 'var(--sticky-color-green)' },
  { label: 'Red', value: 'var(--sticky-color-red)' },
  { label: 'Purple', value: 'var(--sticky-color-purple)' },
  { label: 'Orange', value: 'var(--sticky-color-orange)' },
]

export type StickyNote = Node<{
  content: string
  color?: string
  collapsed?: boolean
  preCollapseWidth?: number
  preCollapseHeight?: number
  attachedToNodeId?: string
  offsetX?: number
  offsetY?: number
}> & {
  width?: number
  height?: number
}

export default function StickyNoteComponent(properties: NodeProps<StickyNote>) {
  const minHeight = FlowConfig.STICKY_NOTE_DEFAULT_HEIGHT
  const minWidth = FlowConfig.STICKY_NOTE_DEFAULT_WIDTH
  const showNodeContextMenu = useNodeContextMenu()
  const updateNodeInternals = useUpdateNodeInternals()
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [isOverflowing, setIsOverflowing] = useState(false)

  const color = properties.data.color ?? 'var(--sticky-color-yellow)'
  const content = properties.data.content

  const CONTENT_PADDING_Y = 24

  useLayoutEffect(() => {
    if (properties.data.collapsed || !contentRef.current) return

    const naturalHeight = contentRef.current.scrollHeight + CONTENT_PADDING_Y
    const clamped = Math.min(
      FlowConfig.STICKY_NOTE_MAX_HEIGHT,
      Math.max(FlowConfig.STICKY_NOTE_DEFAULT_HEIGHT, naturalHeight),
    )

    useFlowStore.getState().setStickyHeight(properties.id, clamped)
  }, [content, properties.data.collapsed, properties.id])

  useEffect(() => {
    updateNodeInternals(properties.id)
  }, [properties.data.collapsed, properties.id, updateNodeInternals])

  useEffect(() => {
    if (properties.data.collapsed) return
    const container = containerRef.current
    if (!container) return
    const check = () => setIsOverflowing(container.scrollHeight > container.clientHeight)
    check()
    const observer = new ResizeObserver(check)
    observer.observe(container)
    return () => observer.disconnect()
  }, [content, properties.data.collapsed])

  const handleDelete = () => {
    useNodeContextStore.getState().setSelectedStickyId(null)
    showNodeContextMenu(false)
    useFlowStore.getState().deleteNode(properties.id)
  }

  if (properties.data.collapsed) {
    return (
      <div
        className={`${properties.selected ? 'ring-1 ring-black/40' : ''}`}
        style={{ width: `${FlowConfig.STICKY_NOTE_BALLOON_WIDTH}px` }}
      >
        <div
          className="flex items-center overflow-hidden rounded-lg px-2"
          style={{ width: `${FlowConfig.STICKY_NOTE_BALLOON_WIDTH}px`, height: '46px', background: color }}
        >
          <span className="line-clamp-2 flex-1 overflow-hidden text-xs leading-snug whitespace-pre-wrap">
            {content}
          </span>
          <button
            className="nodrag ml-1 shrink-0 text-xs hover:cursor-pointer hover:opacity-70"
            onClick={(e) => {
              e.stopPropagation()
              useFlowStore.getState().setStickyCollapsed(properties.id, false)
            }}
            title="Expand"
          >
            ↗
          </button>
          <button
            className="nodrag ml-1 shrink-0 hover:cursor-pointer hover:text-red-600 hover:opacity-50"
            onClick={handleDelete}
            title="Delete"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" stroke="currentColor" strokeLinecap="round">
              <line x1="5" y1="5" x2="15" y2="15" />
              <line x1="5" y1="15" x2="15" y2="5" />
            </svg>
          </button>
        </div>
        <div
          style={{
            marginLeft: '16px',
            width: 0,
            height: 0,
            borderLeft: '12px solid transparent',
            borderRight: '0px solid transparent',
            borderTop: `12px solid ${color}`,
          }}
        />
      </div>
    )
  }

  return (
    <>
      <NodeResizeControl
        minWidth={minWidth}
        minHeight={minHeight}
        style={{ background: 'transparent', border: 'none' }}
      >
        <ResizeIcon />
      </NodeResizeControl>
      <div
        ref={containerRef}
        className={`relative h-full w-full overflow-hidden p-3 text-xs ${properties.selected ? 'ring-1 ring-black/40' : ''}`}
        style={{
          minHeight: `${minHeight}px`,
          minWidth: `${minWidth}px`,
          background: `
            linear-gradient(to left bottom, transparent 50%, rgba(0,0,0,0.4) 0) no-repeat 100% 0 / 2em 2em,
            linear-gradient(-135deg, transparent 1.41em, ${color} 0)
          `,
        }}
      >
        <div ref={contentRef} className="w-full text-xs leading-snug break-words whitespace-pre-wrap">
          {content}
        </div>
        {isOverflowing && (
          <div
            className="pointer-events-none absolute right-0 bottom-0 left-0 h-8"
            style={{ background: `linear-gradient(transparent, ${color})` }}
          />
        )}
        <div className="nodrag absolute top-0 right-5 flex items-center">
          <div
            className="px-1 hover:cursor-pointer hover:opacity-50"
            onClick={(e) => {
              e.stopPropagation()
              useFlowStore.getState().setStickyCollapsed(properties.id, true)
            }}
            title="Collapse"
          >
            −
          </div>
          <div className="px-2 hover:cursor-pointer hover:text-red-600 hover:opacity-50" onClick={handleDelete}>
            <svg width="20" height="20" viewBox="0 0 20 20" stroke="currentColor" strokeLinecap="round">
              <line x1="5" y1="5" x2="15" y2="15" />
              <line x1="5" y1="15" x2="15" y2="5" />
            </svg>
          </div>
        </div>
      </div>
    </>
  )
}
