import type { JSX } from 'react'
import type { FlowNode } from '~/routes/studio/canvas/flow'
import type { FrankNodeType } from '~/routes/studio/canvas/nodetypes/frank-node'
import useFlowStore, { isFrankNode, isStickyNote } from '~/stores/flow-store'
import { STICKY_NOTE_COLORS } from '~/routes/studio/canvas/nodetypes/sticky-note'
import { useShallow } from 'zustand/react/shallow'
import Dropdown from '~/components/inputs/dropdown'

export default function StickyNoteContext({ nodeId }: Readonly<{ nodeId: string }>): JSX.Element | null {
  const node = useFlowStore((flowState): FlowNode | undefined =>
    flowState.nodes.find((node): boolean => node.id === nodeId),
  )
  const frankNodes = useFlowStore(
    useShallow((flowState): FrankNodeType[] => flowState.nodes.filter((node) => isFrankNode(node))),
  )

  if (!node || !isStickyNote(node)) return null

  const { content, color = 'var(--sticky-color-yellow)', attachedToNodeId } = node.data

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-1">
        <label className="text-foreground-muted text-xs font-semibold tracking-wide uppercase">Text</label>
        <textarea
          autoFocus
          onFocus={(focusEvent): void => focusEvent.target.select()}
          value={content}
          onChange={(changeEvent): void => useFlowStore.getState().setStickyText(nodeId, changeEvent.target.value)}
          rows={6}
          className="border-border bg-background text-foreground focus:ring-ring w-full resize-none rounded border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-foreground-muted text-xs font-semibold tracking-wide uppercase">Color</label>
        <div className="flex flex-wrap gap-2">
          {STICKY_NOTE_COLORS.map(({ label, value }): JSX.Element => (
            <button
              key={value}
              title={label}
              onClick={(): void => useFlowStore.getState().setStickyColor(nodeId, value)}
              className="h-7 w-7 rounded-full border-2"
              style={{
                background: value,
                borderColor: color === value ? '#3b82f6' : 'transparent',
                outline: color === value ? '2px solid #3b82f6' : 'none',
                outlineOffset: '2px',
              }}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-foreground-muted text-xs font-semibold tracking-wide uppercase">Attach to node</label>
        <Dropdown
          value={attachedToNodeId ?? ''}
          onChange={(value): void => useFlowStore.getState().setStickyAttachment(nodeId, value || null)}
          options={{
            '': 'None',
            ...Object.fromEntries(frankNodes.map((node): [string, string] => [node.id, node.data.name])),
          }}
        />
      </div>
    </div>
  )
}
