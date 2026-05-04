import useFlowStore, { isFrankNode, isStickyNote } from '~/stores/flow-store'
import { STICKY_NOTE_COLORS } from '~/routes/studio/canvas/nodetypes/sticky-note'
import { useShallow } from 'zustand/react/shallow'
import useNodeContextStore from '~/stores/node-context-store'

export default function StickyNoteContext({ nodeId }: Readonly<{ nodeId: string }>) {
  const node = useFlowStore((flowState) => flowState.nodes.find((n) => n.id === nodeId))
  const frankNodes = useFlowStore(useShallow((flowState) => flowState.nodes.filter(isFrankNode)))

  if (!node || !isStickyNote(node)) return null

  const { content, color = '#fef08a', attachedToNodeId } = node.data

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-1">
        <label className="text-foreground-muted text-xs font-semibold uppercase tracking-wide">Text</label>
        <textarea
          autoFocus
          onFocus={(focusEvent) => focusEvent.target.select()}
          value={content}
          onChange={(changeEvent) => useFlowStore.getState().setStickyText(nodeId, changeEvent.target.value)}
          rows={6}
          className="border-border bg-background text-foreground focus:ring-ring w-full resize-none rounded border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-foreground-muted text-xs font-semibold uppercase tracking-wide">Color</label>
        <div className="flex flex-wrap gap-2">
          {STICKY_NOTE_COLORS.map(({ label, value }) => (
            <button
              key={value}
              title={label}
              onClick={() => useFlowStore.getState().setStickyColor(nodeId, value)}
              className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
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
        <label className="text-foreground-muted text-xs font-semibold uppercase tracking-wide">Attach to node</label>
        <select
          value={attachedToNodeId ?? ''}
          onChange={(changeEvent) => {
              useFlowStore.getState().setStickyAttachment(nodeId, changeEvent.target.value || null)
              void useNodeContextStore.getState().saveFlow?.()
            }}
          className="border-border bg-background text-foreground focus:ring-ring w-full rounded border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
        >
          <option value="">None</option>
          {frankNodes.map((n) => (
            <option key={n.id} value={n.id}>
              {n.data.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
