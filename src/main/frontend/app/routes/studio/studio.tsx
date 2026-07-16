import { ReactFlowProvider } from '@xyflow/react'
import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import StudioTabs from '~/components/tabs/studio-tabs'
import StudioFileStructure from '~/components/file-structure/studio-file-structure'
import FlowCanvas from '~/routes/studio/canvas-flow/canvas-flow'
import { NodeContextMenuContext } from '~/routes/studio/canvas-flow/node-context-menu-context'
import RightPanelContent from '~/routes/studio/right-panel-content'
import useFlowStore from '~/stores/flow-store'
import useNodeContextStore from '~/stores/node-context-store'
import SidebarContentClose from '~/components/sidebars-layout/sidebar-content-close'
import SidebarHeader from '~/components/sidebars-layout/sidebar-header'
import { SidebarSide, useSidebarStore } from '~/components/sidebars-layout/sidebar-layout-store'
import SidebarLayout from '~/components/sidebars-layout/sidebar-layout'
import useTabStore from '~/stores/tab-store'
import { useShallow } from 'zustand/react/shallow'
import { openInEditor } from '~/actions/navigationActions'
import { getBaseName } from '~/utils/path-utils'

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

export default function Studio() {
  const setVisibility = useSidebarStore((state) => state.setVisible)
  const [showNodeContext, setShowNodeContext] = useState(false)
  const { nodeId, editingSubtype, isMultiSelect, selectedStickyId, selectedGroupId } = useNodeContextStore(
    useShallow((state) => ({
      nodeId: state.nodeId,
      editingSubtype: state.editingSubtype,
      isMultiSelect: state.isMultiSelect,
      selectedStickyId: state.selectedStickyId,
      selectedGroupId: state.selectedGroupId,
    })),
  )
  const navigate = useNavigate()

  const stickyNodeExists = useFlowStore(
    (state) => selectedStickyId != null && state.nodes.some((node) => node.id === selectedStickyId),
  )

  const activeStickyId = stickyNodeExists ? selectedStickyId : null

  const { activeTab, activeTabPath } = useTabStore(
    useShallow((state) => ({
      activeTab: state.activeTab,
      activeTabPath: state.activeTab ? state.tabs[state.activeTab]?.configurationPath : null,
    })),
  )

  const allInSameGroup = useFlowStore((flowStore) => {
    const selected = flowStore.nodes.filter((node) => node.selected)
    if (selected.length <= 1) return false
    const content = selected.filter((node) => node.type === 'frankNode' || node.type === 'exitNode')
    if (content.length <= 1) return false
    const firstParentId = content[0].parentId
    return !!firstParentId && content.every((node) => node.parentId === firstParentId)
  })

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
          <NodeContextMenuContext.Provider value={handleShowNodeContext}>
            <ReactFlowProvider>
              <FlowCanvas onOpenInEditor={handleOpenInEditor} />
            </ReactFlowProvider>
          </NodeContextMenuContext.Provider>
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
