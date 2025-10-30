import { useState } from 'react'
import Tabs from '~/components/tabs/tabs'
import BuilderStructure from '~/routes/builder/builder-structure'
import BuilderContext from '~/routes/builder/context/builder-context'
import Flow from '~/routes/builder/canvas/flow'
import NodeContext from '~/routes/builder/context/node-context'
import useNodeContextStore from '~/stores/node-context-store'
import SidebarContentClose from '~/components/sidebars-layout/sidebar-content-close'
import SidebarHeader from '~/components/sidebars-layout/sidebar-header'
import { SidebarSide } from '~/components/sidebars-layout/sidebar-layout-store'
import SidebarLayout from '~/components/sidebars-layout/sidebar-layout'
import useTabStore from '~/stores/tab-store'
import { useShallow } from 'zustand/react/shallow'

export default function Builder() {
  const [showNodeContext, setShowNodeContext] = useState(false)
  const nodeId = useNodeContextStore((state) => state.nodeId)

  const { activeTab } = useTabStore(
    useShallow((state) => ({
      activeTab: state.activeTab,
    })),
  )

  return (
    <SidebarLayout name="studio" windowResizeOnChange={true}>
      <>
        <SidebarHeader side={SidebarSide.LEFT} title="Structure" />
        <BuilderStructure />
      </>
      <>
        <div className="flex">
          <SidebarContentClose side={SidebarSide.LEFT} />
          <div className="grow overflow-x-auto">
            <Tabs />
          </div>
          <SidebarContentClose side={SidebarSide.RIGHT} />
        </div>
        <div className="border-b-border bg-background flex h-12 items-center border-b p-4">Path: {activeTab}</div>

        {activeTab ? (
          <Flow showNodeContextMenu={setShowNodeContext} />
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
        {showNodeContext ? <NodeContext nodeId={nodeId} setShowNodeContext={setShowNodeContext} /> : <BuilderContext />}
      </>
    </SidebarLayout>
  )
}
