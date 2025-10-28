import { useEffect, useState } from 'react'
import Tabs, { type TabsList } from '~/components/tabs/tabs'
import StudioStructure from '~/routes/studio/studio-structure'
import StudioContext from '~/routes/studio/context/studio-context'
import Flow from '~/routes/studio/canvas/flow'
import NodeContext from '~/routes/studio/context/node-context'
import useNodeContextStore from '~/stores/node-context-store'
import SidebarContentClose from '~/components/sidebars-layout/sidebar-content-close'
import SidebarHeader from '~/components/sidebars-layout/sidebar-header'
import { SidebarSide } from '~/components/sidebars-layout/sidebar-layout-store'
import SidebarLayout from '~/components/sidebars-layout/sidebar-layout'
import useTabStore from '~/stores/tab-store'

export default function Studio() {
  const [showNodeContext, setShowNodeContext] = useState(false)
  const nodeId = useNodeContextStore((state) => state.nodeId)
  const [tabs, setTabs] = useState<TabsList>(useTabStore.getState().tabs)
  const [selectedTab, setSelectedTab] = useState<string | undefined>(useTabStore.getState().activeTab)

  useEffect(() => {
    const unsubscribe = useTabStore.subscribe((state) => {
      setTabs(state.tabs)
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const unsubscribe = useTabStore.subscribe(
      (state) => state.activeTab,
      (activeTab) => setSelectedTab(activeTab),
    )
    return () => unsubscribe()
  }, [])

  const handleSelectTab = (key: string) => {
    setSelectedTab(key)
    useTabStore.getState().setActiveTab(key)
  }

  const handleCloseTab = (key: string) => {
    const newTabs = { ...tabs }
    delete newTabs[key]
    setTabs(newTabs)
    useTabStore.getState().removeTab(key)

    if (key === selectedTab) {
      const remainingKeys = Object.keys(newTabs)
      const fallbackKey = remainingKeys.at(-1) // select last one or change logic
      if (fallbackKey) {
        handleSelectTab(fallbackKey)
      } else {
        setSelectedTab(undefined)
      }
    }
  }

  return (
    <SidebarLayout name="studio" windowResizeOnChange={true}>
      <>
        <SidebarHeader side={SidebarSide.LEFT} title="Structure" />
        <StudioStructure />
      </>
      <>
        <div className="flex">
          <SidebarContentClose side={SidebarSide.LEFT} />
          <div className="grow overflow-x-auto">
            <Tabs tabs={tabs} selectedTab={selectedTab} onSelectTab={handleSelectTab} onCloseTab={handleCloseTab} />
          </div>
          <SidebarContentClose side={SidebarSide.RIGHT} />
        </div>
        <div className="border-b-border bg-background flex h-12 items-center border-b p-4">Path: {selectedTab}</div>
        <Flow showNodeContextMenu={setShowNodeContext} />
      </>
      <>
        <SidebarHeader side={SidebarSide.RIGHT} title={showNodeContext ? 'Edit node' : 'Palette'} />
        {showNodeContext ? <NodeContext nodeId={nodeId} setShowNodeContext={setShowNodeContext} /> : <StudioContext />}
      </>
    </SidebarLayout>
  )
}
