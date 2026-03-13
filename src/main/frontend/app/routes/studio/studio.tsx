import { useCallback, useState } from 'react'
import StudioTabs from '~/components/tabs/studio-tabs'
import StudioFileStructure from '~/components/file-structure/studio-file-structure'
import StudioContext from '~/routes/studio/context/studio-context'
import Flow from '~/routes/studio/canvas/flow'
import NodeContext from '~/routes/studio/context/node-context'
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

export default function Studio() {
  const project = useProjectStore((state) => state.project)
  const setVisibility = useSidebarStore((state) => state.setVisibility)
  const [showNodeContext, setShowNodeContext] = useState(false)
  const { nodeId, editingSubtype } = useNodeContextStore(
    useShallow((s) => ({ nodeId: s.nodeId, editingSubtype: s.editingSubtype })),
  )

  const { activeTab, activeTabPath } = useTabStore(
    useShallow((state) => ({
      activeTab: state.activeTab,
      activeTabPath: state.activeTab ? state.tabs[state.activeTab]?.configurationPath : undefined,
    })),
  )

  const handleShowNodeContext = useCallback(
    (visible: boolean) => {
      setShowNodeContext(visible)
      if (visible) {
        setVisibility('studio', SidebarSide.RIGHT, true)
      }
    },
    [setVisibility],
  )

  const handleOpenInEditor = useCallback(() => {
    if (!activeTabPath) return

    const fileName = activeTabPath.split(/[/\\]/).pop()
    if (!fileName) return

    openInEditor(fileName, activeTabPath)
  }, [activeTabPath])

  return (
    <SidebarLayout name="studio">
      <>
        <SidebarHeader side={SidebarSide.LEFT} title="Structure" />
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
            <div className="border-b-border bg-background flex h-12 items-center justify-between border-b p-4">
              <span>
                Path: {activeTabPath && project ? toProjectRelativePath(activeTabPath, project) : activeTabPath}
              </span>
              <Button onClick={handleOpenInEditor} className="flex items-center gap-1.5" title="Open in Editor">
                <CodeIcon className="h-4 w-4 fill-current" />
                Open in Editor
              </Button>
            </div>
            <Flow showNodeContextMenu={handleShowNodeContext} />
          </>
        ) : (
          <div className="text-muted-foreground flex h-full flex-col items-center justify-center p-8 text-center">
            <div className="border-border bg-background/40 max-w-md rounded-2xl border border-dashed p-10 shadow-inner backdrop-blur-sm">
              <h2 className="mb-2 text-xl font-semibold">No file selected</h2>
              <p className="text-sm">
                Select an adapter from the file structure on the left to start building your flow.
              </p>
            </div>
          </div>
        )}
      </>
      <>
        <SidebarHeader
          side={SidebarSide.RIGHT}
          title={showNodeContext ? `Edit ${editingSubtype ?? 'node'}` : 'Palette'}
        />
        {showNodeContext ? (
          <NodeContext nodeId={nodeId} setShowNodeContext={handleShowNodeContext} />
        ) : (
          <StudioContext />
        )}
      </>
    </SidebarLayout>
  )
}
