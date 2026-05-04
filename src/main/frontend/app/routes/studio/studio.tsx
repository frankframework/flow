import { useCallback, useEffect, useState } from 'react'
import StudioTabs from '~/components/tabs/studio-tabs'
import StudioFileStructure from '~/components/file-structure/studio-file-structure'
import StudioContext from '~/routes/studio/context/studio-context'
import Flow from '~/routes/studio/canvas/flow'
import NodeContext from '~/routes/studio/context/node-context'
import StickyNoteContext from '~/routes/studio/context/sticky-note-context'
import useNodeContextStore from '~/stores/node-context-store'
import SidebarContentClose from '~/components/sidebars-layout/sidebar-content-close'
import SidebarHeader from '~/components/sidebars-layout/sidebar-header'
import { SidebarSide, useSidebarStore } from '~/components/sidebars-layout/sidebar-layout-store'
import SidebarLayout from '~/components/sidebars-layout/sidebar-layout'
import useTabStore from '~/stores/tab-store'
import { useShallow } from 'zustand/react/shallow'
import { useProjectStore } from '~/stores/project-store'
import { toProjectRelativePath } from '~/utils/path-utils'
import CodeIcon from '/icons/solar/Code.svg?react'
import { openInEditor } from '~/actions/navigationActions'
import Button from '~/components/inputs/button'
import useFlowStore, { isStickyNote } from '~/stores/flow-store'
import type { StickyNote } from '~/routes/studio/canvas/nodetypes/sticky-note'
import { ALL_SHORTCUTS, formatShortcutParts, useShortcutStore } from '~/stores/shortcut-store'

interface RightPanelProps {
  isMultiSelect: boolean
  selectedStickyId: string | null
  showNodeContext: boolean
  nodeId: number
  editingSubtype: string | null
  groupLabel: string
  groupKeyHint: string
  groupActionId: string
  onShowNodeContext: (visible: boolean) => void
}

function getRightPanelTitle(
        isMultiSelect: boolean,
        selectedStickyId: string | null,
        groupLabel: string,
        showNodeContext: boolean,
        editingSubtype: string | null,
): string {
  if (isMultiSelect) return groupLabel
  if (selectedStickyId) return 'Sticky Note'
  if (showNodeContext) return `Edit ${editingSubtype ?? 'node'}`
  return 'Palette'
}

function MultiSelectPanel() {
  const allInSameGroup = useFlowStore((state) => {
    const selected = state.nodes.filter((node) => node.selected)
    if (selected.length < 2) return false
    const firstParent = selected[0].parentId
    return Boolean(firstParent) && selected.every((node) => node.parentId === firstParent)
  })

  const platform = useShortcutStore((s) => s.platform)

  const groupDef = ALL_SHORTCUTS.find((shortCut) => shortCut.id === 'studio.group')!
  const ungroupDef = ALL_SHORTCUTS.find((shortCut) => shortCut.id === 'studio.ungroup')!

  const groupParts = formatShortcutParts(groupDef, platform)
  const ungroupParts = formatShortcutParts(ungroupDef, platform)

  const triggerGroup = () => useShortcutStore.getState().shortcuts.get('studio.group')?.handler?.()
  const triggerUngroup = () => useShortcutStore.getState().shortcuts.get('studio.ungroup')?.handler?.()

  const actionLabel = allInSameGroup ? 'Ungroup' : 'Group'
  const actionParts = allInSameGroup ? ungroupParts : groupParts
  const triggerAction = allInSameGroup ? triggerUngroup : triggerGroup

  return (
    <div className="flex flex-col gap-2 p-4">
      <Button onClick={triggerAction} className="flex items-center justify-between gap-2 px-4 py-2 text-sm">
        <span>{actionLabel}</span>
        <span className="flex gap-1">
          {actionParts.map((part) => (
            <kbd
              key={part}
              className="rounded border border-current/40 bg-current/10 px-1.5 py-0.5 font-mono text-xs"
            >
              {part}
            </kbd>
          ))}
        </span>
      </Button>
    </div>
  )
}

function AttachedNotesPanel({ nodeId }: { nodeId: number }) {
  const attachedNotes = useFlowStore(useShallow((state) =>
          state.nodes.filter((node) => isStickyNote(node) && (node as StickyNote).data.attachedToNodeId === nodeId.toString()),
  )) as StickyNote[]

  if (attachedNotes.length === 0) return null

  return (
    <div className="border-t-border mt-2 border-t pt-2">
      <div className="px-4 pb-1 text-xs font-semibold uppercase tracking-wide text-foreground-muted">Notes</div>
      <div className="flex flex-col gap-2 px-4 pb-4">
        {attachedNotes.map((note) => (
          <div
            key={note.id}
            className="rounded-lg p-2 text-xs leading-snug"
            style={{ background: note.data.color ?? '#fef08a' }}
          >
            {note.data.content || <span className="opacity-40">Empty note</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

function RightPanelContent({
                             isMultiSelect,
                             selectedStickyId,
                             showNodeContext,
                             nodeId
                           }: RightPanelProps) {
  if (isMultiSelect) return <MultiSelectPanel />
  if (selectedStickyId) return <StickyNoteContext nodeId={selectedStickyId} />

  if (showNodeContext) return (
          <div className="flex flex-col overflow-y-auto">
            <NodeContext nodeId={nodeId} setShowNodeContext={handleShowNodeContext} />
            <AttachedNotesPanel nodeId={nodeId} />
          </div>
  )
}

export default function Studio() {
  const project = useProjectStore((state) => state.project)
  const setVisibility = useSidebarStore((state) => state.setVisibility)
  const [showNodeContext, setShowNodeContext] = useState(false)
  const { nodeId, editingSubtype, isMultiSelect, selectedStickyId } = useNodeContextStore(
    useShallow((state) => ({
      nodeId: state.nodeId,
      editingSubtype: state.editingSubtype,
      isMultiSelect: state.isMultiSelect,
      selectedStickyId: state.selectedStickyId,
    })),
  )

  const stickyNodeExists = useFlowStore((state) =>
    selectedStickyId != null && state.nodes.some((node) => node.id === selectedStickyId),
  )

  const activeStickyId = stickyNodeExists ? selectedStickyId : null

  const { activeTab, activeTabPath } = useTabStore(
    useShallow((state) => ({
      activeTab: state.activeTab,
      activeTabPath: state.activeTab ? state.tabs[state.activeTab]?.configurationPath : undefined,
    })),
  )

  const platform = useShortcutStore((shortcut) => shortcut.platform)

  const allInSameGroup = useFlowStore((flowStore) => {
    const selected = flowStore.nodes.filter((node) => node.selected)
    if (selected.length <= 1) return false
    const firstParentId = selected[0].parentId
    return !!firstParentId && selected.every((node) => node.parentId === firstParentId)
  })

  const groupActionId = allInSameGroup ? 'studio.ungroup' : 'studio.group'
  const groupLabel = allInSameGroup ? 'Ungroup' : 'Group Selection'
  const groupShortcutDef = ALL_SHORTCUTS.find((shortcut) => shortcut.id === groupActionId)
  const groupKeyHint = groupShortcutDef ? formatShortcutParts(groupShortcutDef, platform).join('+') : ''

  const handleShowNodeContext = useCallback(
    (visible: boolean) => {
      setShowNodeContext(visible)
      if (visible) {
        setVisibility('studio', SidebarSide.RIGHT, true)
      }
    },
    [setVisibility],
  )

  useEffect(() => {
    if (selectedStickyId && !stickyNodeExists) {
      useNodeContextStore.getState().setSelectedStickyId(null)
      setShowNodeContext(false)
    }
  }, [selectedStickyId, stickyNodeExists])

  const handleOpenInEditor = useCallback(() => {
    if (!activeTabPath) return

    const fileName = activeTabPath.split(/[/\\]/).pop()
    if (!fileName) return

    openInEditor(fileName, activeTabPath)
  }, [activeTabPath])

  const rightPanelTitle = getRightPanelTitle(isMultiSelect, activeStickyId, groupLabel, showNodeContext, editingSubtype)

  return (
    <SidebarLayout name="studio">
      <>
        <SidebarHeader side={SidebarSide.LEFT} title="Adapter" />
        <StudioFileStructure />
      </>
      <>
        <div className="flex">
          <SidebarContentClose side={SidebarSide.LEFT} />
          <div className="grow overflow-x-auto">
            <StudioTabs />
          </div>
          <SidebarContentClose side={SidebarSide.RIGHT} />
        </div>

        {activeTab ? (
          <>
            <div className="border-b-border bg-background flex items-center justify-between border-b px-4 py-2">
              <span className="text-foreground-muted truncate text-sm">
                {activeTabPath && project ? toProjectRelativePath(activeTabPath, project) : activeTabPath}
              </span>
              <Button
                onClick={handleOpenInEditor}
                className="flex shrink-0 items-center gap-2 px-5 py-2 text-sm"
                title="Open in Editor"
              >
                <CodeIcon className="h-4 w-4 fill-current" />
                <span className="whitespace-nowrap">Open in Editor</span>
              </Button>
            </div>
            <Flow showNodeContextMenu={handleShowNodeContext} />
          </>
        ) : (
          <div className="text-foreground-muted flex h-full flex-col items-center justify-center p-8 text-center">
            <h2 className="mb-2 text-xl font-semibold">No adapter selected</h2>
            <p className="text-sm">
              Select an adapter from the file structure on the left to start building your flow.
            </p>
          </div>
        )}
      </>
      <>
        <SidebarHeader side={SidebarSide.RIGHT} title={rightPanelTitle} />
        <RightPanelContent
          isMultiSelect={isMultiSelect}
          selectedStickyId={activeStickyId}
          showNodeContext={showNodeContext}
          nodeId={nodeId}
          editingSubtype={editingSubtype}
          groupLabel={groupLabel}
          groupKeyHint={groupKeyHint}
          groupActionId={groupActionId}
          onShowNodeContext={handleShowNodeContext}
        />
      </>
    </SidebarLayout>
  )
}
