import { useShallow } from 'zustand/react/shallow'
import Button from '~/components/inputs/button'
import type { StickyNote } from '~/routes/studio/canvas-flow/nodetypes/sticky-note'
import GroupContext from '~/routes/studio/context/group-context'
import NodeContext from '~/routes/studio/context/node-context'
import StickyNoteContext from '~/routes/studio/context/sticky-note-context'
import StudioContext from '~/routes/studio/context/studio-context'
import useFlowStore, { isStickyNote } from '~/stores/flow-store'
import { ALL_SHORTCUTS, formatShortcutParts, useShortcutStore } from '~/stores/shortcut-store'

type RightPanelProps = {
  isMultiSelect: boolean
  selectedStickyId: string | null
  selectedGroupId: string | null
  showNodeContext: boolean
  nodeId: number
  editingSubtype: string | null
  onShowNodeContext: (visible: boolean) => void
}

export default function RightPanelContent({
  isMultiSelect,
  selectedStickyId,
  selectedGroupId,
  showNodeContext,
  nodeId,
  onShowNodeContext,
}: RightPanelProps) {
  const showPalette = !isMultiSelect && !selectedStickyId && !selectedGroupId && !showNodeContext

  return (
    <>
      {isMultiSelect && <MultiSelectPanel />}
      {!isMultiSelect && selectedStickyId && <StickyNoteContext nodeId={selectedStickyId} />}
      {!isMultiSelect && !selectedStickyId && selectedGroupId && <GroupContext nodeId={selectedGroupId} />}
      {!isMultiSelect && !selectedStickyId && !selectedGroupId && showNodeContext && (
        <div className="flex min-h-0 flex-1 flex-col">
          <AttachedNotesPanel nodeId={nodeId} />
          <NodeContext nodeId={nodeId} setShowNodeContext={onShowNodeContext} />
        </div>
      )}

      <div className={showPalette ? 'contents' : 'hidden'}>
        <StudioContext />
      </div>
    </>
  )
}

function MultiSelectPanel() {
  const { allInSameGroup, groupId } = useFlowStore(
    useShallow((state) => {
      const selected = state.nodes.filter((node) => node.selected)
      if (selected.length < 2) return { allInSameGroup: false, groupId: null }

      const content = selected.filter((node) => node.type === 'frankNode' || node.type === 'exitNode')
      if (content.length < 2) return { allInSameGroup: false, groupId: null }

      const firstParent = content[0].parentId
      const allSame = Boolean(firstParent) && content.every((node) => node.parentId === firstParent)
      return { allInSameGroup: allSame, groupId: allSame ? (firstParent ?? null) : null }
    }),
  )

  const platform = useShortcutStore((shortcut) => shortcut.platform)
  const groupDef = ALL_SHORTCUTS.find((shortCut) => shortCut.id === 'studio.group')!
  const groupParts = formatShortcutParts(groupDef, platform)
  const triggerGroup = () => useShortcutStore.getState().shortcuts.get('studio.group')?.handler?.()

  if (allInSameGroup && groupId) {
    return <GroupContext nodeId={groupId} />
  }

  return (
    <div className="p-4">
      <Button onClick={triggerGroup} className="flex w-full items-center justify-between gap-2 px-4 py-2 text-sm">
        <span>Group</span>
        <span className="flex gap-1">
          {groupParts.map((part) => (
            <kbd key={part} className="rounded border border-current/40 bg-current/10 px-1.5 py-0.5 font-mono text-xs">
              {part}
            </kbd>
          ))}
        </span>
      </Button>
    </div>
  )
}

function AttachedNotesPanel({ nodeId }: { nodeId: number }) {
  const attachedNotes = useFlowStore(
    useShallow((state) =>
      state.nodes.filter(
        (node) => isStickyNote(node) && (node as StickyNote).data.attachedToNodeId === nodeId.toString(),
      ),
    ),
  ) as StickyNote[]

  if (attachedNotes.length === 0) return null

  return (
    <div className="border-b-border border-b px-4 pt-4 pb-3">
      <div className="text-foreground-muted mb-2 text-xs font-semibold tracking-wide uppercase">
        {attachedNotes.length === 1 ? 'Note' : 'Notes'}
      </div>
      <div className="flex flex-col gap-2">
        {attachedNotes.map((note) => (
          <div
            key={note.id}
            className="rounded-lg p-2 text-xs leading-snug wrap-break-word whitespace-pre-wrap"
            style={{ background: note.data.color ?? '#fef08a' }}
          >
            {note.data.content || <span className="opacity-40">Empty note</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
