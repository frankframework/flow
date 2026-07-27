import { type JSX, useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import StudioTabs from '~/components/tabs/studio-tabs'
import StudioFileStructure from '~/components/file-structure/studio-file-structure'
import StudioContext from '~/routes/studio/context/studio-context'
import Flow, { type FlowNode } from '~/routes/studio/canvas/flow'
import NodeContext from '~/routes/studio/context/node-context'
import StickyNoteContext from '~/routes/studio/context/sticky-note-context'
import useNodeContextStore from '~/stores/node-context-store'
import SidebarContentClose from '~/components/sidebars-layout/sidebar-content-close'
import SidebarHeader from '~/components/sidebars-layout/sidebar-header'
import { SidebarSide, useSidebarStore } from '~/components/sidebars-layout/sidebar-layout-store'
import SidebarLayout from '~/components/sidebars-layout/sidebar-layout'
import useTabStore from '~/stores/tab-store'
import { useShallow } from 'zustand/react/shallow'
import { openInEditor } from '~/actions/navigationActions'
import { getBaseName } from '~/utils/path-utils'
import Button from '~/components/inputs/button'
import useFlowStore, { isStickyNote } from '~/stores/flow-store'
import type { StickyNote } from '~/routes/studio/canvas/nodetypes/sticky-note'
import { ALL_SHORTCUTS, formatShortcutParts, type Platform, useShortcutStore } from '~/stores/shortcut-store'
import GroupContext from '~/routes/studio/context/group-context'

type RightPanelProperties = {
  isMultiSelect: boolean
  selectedStickyId: string | null
  selectedGroupId: string | null
  showNodeContext: boolean
  nodeId: number
  editingSubtype: string | null
  onShowNodeContext: (visible: boolean) => void
}

function getRightPanelTitle(
  isMultiSelect: boolean,
  allInSameGroup: boolean,
  selectedStickyId: string | null,
  selectedGroupId: string | null,
  showNodeContext: boolean,
  editingSubtype: string | null,
): string {
  if (isMultiSelect) return allInSameGroup ? 'Group' : 'Group Selection'
  if (selectedStickyId) return 'Sticky Note'
  if (selectedGroupId) return 'Group'
  if (showNodeContext) return `Edit ${editingSubtype ?? 'node'}`
  return 'Palette'
}

function MultiSelectPanel(): JSX.Element {
  const { allInSameGroup, groupId } = useFlowStore(
    useShallow((state): { allInSameGroup: boolean; groupId: string | null } => {
      const selected = state.nodes.filter((node): boolean | undefined => node.selected)
      if (selected.length < 2) return { allInSameGroup: false, groupId: null }

      const content = selected.filter((node): boolean => node.type === 'frankNode' || node.type === 'exitNode')
      if (content.length < 2) return { allInSameGroup: false, groupId: null }

      const firstParent = content[0].parentId
      const allSame = Boolean(firstParent) && content.every((node): boolean => node.parentId === firstParent)
      return { allInSameGroup: allSame, groupId: allSame ? (firstParent ?? null) : null }
    }),
  )

  const platform = useShortcutStore((shortcut): Platform => shortcut.platform)
  if (allInSameGroup && groupId) {
    return <GroupContext nodeId={groupId} />
  }

  const groupDefinition = ALL_SHORTCUTS.find((shortCut): boolean => shortCut.id === 'studio.group')!
  const groupParts = formatShortcutParts(groupDefinition, platform)
  const triggerGroup = (): boolean | void | undefined =>
    useShortcutStore.getState().shortcuts.get('studio.group')?.handler?.()

  return (
    <div className="p-4">
      <Button onClick={triggerGroup} className="flex w-full items-center justify-between gap-2 px-4 py-2 text-sm">
        <span>Group</span>
        <span className="flex gap-1">
          {groupParts.map((part): JSX.Element => (
            <kbd key={part} className="rounded border border-current/40 bg-current/10 px-1.5 py-0.5 font-mono text-xs">
              {part}
            </kbd>
          ))}
        </span>
      </Button>
    </div>
  )
}

function AttachedNotesPanel({ nodeId }: { nodeId: number }): JSX.Element | null {
  const attachedNotes = useFlowStore(
    useShallow((state): FlowNode[] =>
      state.nodes.filter(
        (node): boolean => isStickyNote(node) && (node as StickyNote).data.attachedToNodeId === nodeId.toString(),
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
        {attachedNotes.map((note): JSX.Element => (
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

function RightPanelContent({
  isMultiSelect,
  selectedStickyId,
  selectedGroupId,
  showNodeContext,
  nodeId,
  onShowNodeContext,
}: RightPanelProperties): JSX.Element {
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

export default function Studio(): JSX.Element {
  const setVisibility = useSidebarStore(
    (state): ((name: string, side: SidebarSide, value: boolean) => void) => state.setVisible,
  )
  const [showNodeContext, setShowNodeContext] = useState(false)
  const { nodeId, editingSubtype, isMultiSelect, selectedStickyId, selectedGroupId } = useNodeContextStore(
    useShallow(
      (
        state,
      ): {
        nodeId: number
        editingSubtype: string | null
        isMultiSelect: boolean
        selectedStickyId: string | null
        selectedGroupId: string | null
      } => ({
        nodeId: state.nodeId,
        editingSubtype: state.editingSubtype,
        isMultiSelect: state.isMultiSelect,
        selectedStickyId: state.selectedStickyId,
        selectedGroupId: state.selectedGroupId,
      }),
    ),
  )
  const navigate = useNavigate()

  const stickyNodeExists = useFlowStore(
    (state): boolean => selectedStickyId != null && state.nodes.some((node): boolean => node.id === selectedStickyId),
  )

  const activeStickyId = stickyNodeExists ? selectedStickyId : null

  const { activeTab, activeTabPath } = useTabStore(
    useShallow((state): { activeTab: string; activeTabPath: string | undefined } => ({
      activeTab: state.activeTab,
      activeTabPath: state.activeTab ? state.tabs[state.activeTab]?.configurationPath : undefined,
    })),
  )

  const allInSameGroup = useFlowStore((flowStore): boolean => {
    const selected = flowStore.nodes.filter((node): boolean | undefined => node.selected)
    if (selected.length <= 1) return false
    const content = selected.filter((node): boolean => node.type === 'frankNode' || node.type === 'exitNode')
    if (content.length <= 1) return false
    const firstParentId = content[0].parentId
    return !!firstParentId && content.every((node): boolean => node.parentId === firstParentId)
  })

  const handleShowNodeContext = useCallback(
    (visible: boolean): void => {
      setShowNodeContext(visible)
      if (visible) {
        setVisibility('studio', SidebarSide.RIGHT, true)
      }
    },
    [setVisibility],
  )

  useEffect((): void => {
    if (!selectedStickyId || stickyNodeExists) {
      return
    }

    useNodeContextStore.getState().setSelectedStickyId(null)
    setShowNodeContext(false)
  }, [selectedStickyId, stickyNodeExists])

  const handleOpenInEditor = useCallback((): void => {
    if (!activeTabPath) return

    const fileName = getBaseName(activeTabPath)
    if (!fileName) return

    openInEditor(fileName, activeTabPath, navigate)
  }, [activeTabPath, navigate])

  const rightPanelTitle = getRightPanelTitle(
    isMultiSelect,
    allInSameGroup,
    activeStickyId,
    selectedGroupId,
    showNodeContext,
    editingSubtype,
  )

  return (
    <SidebarLayout name="studio" windowResizeOnChange={true}>
      <>
        <SidebarHeader side={SidebarSide.LEFT} title="Adapters" />
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
            <Flow showNodeContextMenu={handleShowNodeContext} onOpenInEditor={handleOpenInEditor} />
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
          selectedGroupId={selectedGroupId}
          showNodeContext={showNodeContext}
          nodeId={nodeId}
          editingSubtype={editingSubtype}
          onShowNodeContext={handleShowNodeContext}
        />
      </>
    </SidebarLayout>
  )
}
