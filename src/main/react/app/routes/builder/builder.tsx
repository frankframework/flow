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

export default function Builder() {
  const [showNodeContext, setShowNodeContext] = useState(false)
  const nodeId = useNodeContextStore((state) => state.nodeId)
  const activeTab = useTabStore((state) => state.activeTab)

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
        <div className="border-b-border h-12 border-b">Path: {activeTab}</div>
        <Flow showNodeContextMenu={setShowNodeContext} />
      </>
      <>
        <SidebarHeader side={SidebarSide.RIGHT} title={showNodeContext ? 'Edit node' : 'Palette'} />
        {showNodeContext ? <NodeContext nodeId={nodeId} setShowNodeContext={setShowNodeContext} /> : <BuilderContext />}
      </>
    </SidebarLayout>
  )
}
