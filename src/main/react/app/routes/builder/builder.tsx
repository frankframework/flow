import { useState } from 'react'
import Tabs, { type TabsList } from '~/components/tabs/tabs'
import BuilderStructure from '~/routes/builder/builder-structure'
import BuilderContext from '~/routes/builder/context/builder-context'
import Flow from '~/routes/builder/canvas/flow'
import FolderIcon from '/icons/solar/Folder.svg?react'
import NodeContext from '~/routes/builder/context/node-context'
import useNodeContextStore from '~/stores/node-context-store'
import SidebarContentClose from '~/components/sidebars-layout/sidebar-content-close'
import SidebarHeader from '~/components/sidebars-layout/sidebar-header'
import { SidebarSide } from '~/components/sidebars-layout/sidebar-layout-store'
import SidebarLayout from '~/components/sidebars-layout/sidebar-layout'

const tabs = {
  tab1: { value: 'tab1', icon: FolderIcon },
  tab2: { value: 'tab2' },
  tab3: { value: 'tab3' },
  tab4: { value: 'tab4' },
  tab5: { value: 'tab5' },
  tab6: { value: 'tab6' },
  tab7: { value: 'tab7' },
  tab8: { value: 'tab8' },
  tab9: { value: 'tab9' },
  tab10: { value: 'tab10' },
} as TabsList

export default function Builder() {
  const [selectedTab, setSelectedTab] = useState<string | undefined>()
  const [showNodeContext, setShowNodeContext] = useState(false)
  const nodeId = useNodeContextStore((state) => state.nodeId)

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
            <Tabs onSelectedTabChange={setSelectedTab} initialTabs={tabs} />
          </div>
          <SidebarContentClose side={SidebarSide.RIGHT} />
        </div>
        <div className="h-12 border-b border-b-border">
          Path: {Object.entries(tabs).find(([key]) => key === selectedTab)?.[1]?.value}
        </div>
        <Flow showNodeContextMenu={setShowNodeContext} />
      </>
      <>
        <SidebarHeader side={SidebarSide.RIGHT} title={showNodeContext ? 'Edit node' : 'Palette'} />
        {showNodeContext ? <NodeContext nodeId={nodeId} setShowNodeContext={setShowNodeContext} /> : <BuilderContext />}
      </>
    </SidebarLayout>
  )
}
