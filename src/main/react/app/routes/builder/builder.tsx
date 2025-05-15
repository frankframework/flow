import { useState } from 'react'
import Tabs, { type TabsList } from '~/components/tabs/tabs'
import BuilderStructure from '~/routes/builder/builder-structure'
import BuilderContext from '~/routes/builder/context/builder-context'
import Flow from '~/routes/builder/canvas/flow'
import FolderIcon from '/icons/solar/Folder.svg?react'
import NodeContext from '~/routes/builder/context/node-context'
import useNodeContextStore from '~/stores/node-context-store'
import SidebarsContentClose from '~/components/sidebars/sidebars-content-close'
import SidebarsHeader from '~/components/sidebars/sidebars-header'
import { SidebarIndex } from '~/components/sidebars/sidebars-store'
import Sidebars from '~/components/sidebars/sidebars'

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

const SIDEBARS_ID = 'builder'

export default function Builder() {
  const [selectedTab, setSelectedTab] = useState<string | undefined>()
  const [showNodeContext, setShowNodeContext] = useState(false)

  const nodeId = useNodeContextStore((state) => state.nodeId)

  const LeftSidebar = () => (
    <>
      <SidebarsHeader sidebarId={SIDEBARS_ID} index={SidebarIndex.LEFT} title="Structure" />
      <BuilderStructure />
    </>
  )

  const Content = () => (
    <>
      <div className="flex">
        <SidebarsContentClose sidebarId={SIDEBARS_ID} index={SidebarIndex.LEFT} />
        <div className="grow overflow-x-auto">
          <Tabs onSelectedTabChange={setSelectedTab} initialTabs={tabs} />
        </div>
        <SidebarsContentClose sidebarId={SIDEBARS_ID} index={SidebarIndex.RIGHT} />
      </div>
      <div className="h-12 border-b border-b-gray-200">
        Path: {Object.entries(tabs).find(([key]) => key === selectedTab)?.[1]?.value}
      </div>
      <Flow showNodeContextMenu={setShowNodeContext} />
    </>
  )

  const RightSidebar = () => (
    <>
      <SidebarsHeader
        sidebarId={SIDEBARS_ID}
        index={SidebarIndex.RIGHT}
        title={showNodeContext ? 'Edit node iets' : 'Palette'}
      />
      {showNodeContext ? <NodeContext nodeId={nodeId} setShowNodeContext={setShowNodeContext} /> : <BuilderContext />}
    </>
  )

  return (
    <Sidebars
      sidebarsId={SIDEBARS_ID}
      leftSidebar={LeftSidebar}
      content={Content}
      rightSidebar={RightSidebar}
      windowResizeOnChange={true}
    />
  )
}
