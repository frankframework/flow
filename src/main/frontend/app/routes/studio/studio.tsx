import { useState } from 'react'
import StudioTabs from '~/components/tabs/studio-tabs'
import FileStructure from '~/components/file-structure/file-structure'
import StudioContext from '~/routes/studio/context/studio-context'
import Flow from '~/routes/studio/canvas/flow'
import NodeContext from '~/routes/studio/context/node-context'
import useNodeContextStore from '~/stores/node-context-store'
import SidebarContentClose from '~/components/sidebars-layout/sidebar-content-close'
import SidebarHeader from '~/components/sidebars-layout/sidebar-header'
import { SidebarSide } from '~/components/sidebars-layout/sidebar-layout-store'
import SidebarLayout from '~/components/sidebars-layout/sidebar-layout'
import useTabStore from '~/stores/tab-store'
import { useShallow } from 'zustand/react/shallow'
import { ToastContainer } from 'react-toastify'
import { useTheme } from '~/hooks/use-theme'

export default function Studio() {
  const [showNodeContext, setShowNodeContext] = useState(false)
  const theme = useTheme()
  const nodeId = useNodeContextStore((state) => state.nodeId)

  const { activeTab, activeTabPath } = useTabStore(
    useShallow((state) => ({
      activeTab: state.activeTab,
      activeTabPath: state.activeTab ? state.tabs[state.activeTab]?.configurationPath : undefined,
    })),
  )

  return (
    // FIX: Verwijder windowResizeOnChange={true}
    <SidebarLayout name="studio">
      <>
        <SidebarHeader side={SidebarSide.LEFT} title="Structure" />
        <FileStructure />
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
            <div className="border-b-border bg-background flex h-12 items-center border-b p-4">
              Path: {activeTabPath}
            </div>
            <Flow showNodeContextMenu={setShowNodeContext} />
            <ToastContainer position="bottom-right" theme={theme} closeOnClick={true} />
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
        <SidebarHeader side={SidebarSide.RIGHT} title={showNodeContext ? 'Edit node' : 'Palette'} />
        {showNodeContext ? <NodeContext nodeId={nodeId} setShowNodeContext={setShowNodeContext} /> : <StudioContext />}
      </>
    </SidebarLayout>
  )
}
