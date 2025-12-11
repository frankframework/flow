import { type Node, type NodeProps, NodeResizeControl } from '@xyflow/react'
import { FlowConfig } from '~/routes/studio/canvas/flow.config'
import { ResizeIcon } from '~/routes/studio/canvas/nodetypes/frank-node'
import { useEffect, useRef, useState } from 'react'
import useFlowStore from '~/stores/flow-store'

export type StickyNote = Node<{
  content: string
}>

export default function StickyNoteComponent(properties: NodeProps<StickyNote>) {
  const minHeight = FlowConfig.STICKY_NOTE_DEFAULT_HEIGHT
  const minWidth = FlowConfig.STICKY_NOTE_DEFAULT_WIDTH

  const [localContent, setLocalContent] = useState(properties.data.content)
  const [dimensions, setDimensions] = useState({
    width: minWidth, // Initial width
    height: minHeight, // Initial height
  })

  const textareaReference = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaReference.current) {
      // Force layout update to avoid internal scroll
      textareaReference.current.style.height = 'auto'
      textareaReference.current.style.height = `${textareaReference.current.scrollHeight}px`
    }
  }, [localContent, dimensions])

  const deleteNode = () => {
    useFlowStore.getState().deleteNode(properties.id)
  }

  useEffect(() => {
    setLocalContent(properties.data.content)
  }, [properties.data.content])

  const updateContent = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = event.target.value

    setLocalContent(newText)
    useFlowStore.getState().setStickyText(properties.id, newText)
  }

  return (
    <>
      <NodeResizeControl
        minWidth={minWidth}
        minHeight={minHeight}
        onResize={(_event, data) => {
          setDimensions({ width: data.width, height: data.height })
        }}
        style={{
          background: 'transparent',
          border: 'none',
        }}
      >
        <ResizeIcon />
      </NodeResizeControl>
      <div
        className={`h-full w-full overflow-hidden p-5 text-xs ${properties.selected ? 'border-2 border-black' : ''}`}
        style={{
          minHeight: `${minHeight}px`,
          minWidth: `${minWidth}px`,
          background: `
      linear-gradient(to left bottom, transparent 50%, rgba(0,0,0,0.4) 0) no-repeat 100% 0 / 2em 2em,
      linear-gradient(-135deg, transparent 1.41em, var(--type-sticky-note) 0)
    `,
        }}
      >
        <textarea
          ref={textareaReference}
          value={localContent}
          onChange={updateContent}
          className="nodrag h-full w-full resize-none overflow-hidden text-xs leading-snug outline-none"
        />
        <div
          className="nodrag absolute top-0 right-5 px-2 hover:cursor-pointer hover:border-red-600 hover:text-red-600 hover:opacity-50"
          onClick={deleteNode}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" stroke="currentColor" strokeLinecap="round">
            <line x1="5" y1="5" x2="15" y2="15" />
            <line x1="5" y1="15" x2="15" y2="5" />
          </svg>
        </div>
      </div>
    </>
  )
}
