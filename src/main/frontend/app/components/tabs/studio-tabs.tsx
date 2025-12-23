import { useShallow } from 'zustand/react/shallow'
import useTabStore from '~/stores/tab-store'
import { TabsView } from './tabs'

export default function StudioTabs() {
  const { tabs, activeTab, setActiveTab, removeTabAndSelectFallback } = useTabStore(
    useShallow((state) => ({
      tabs: state.tabs,
      activeTab: state.activeTab,
      setActiveTab: state.setActiveTab,
      removeTabAndSelectFallback: state.removeTabAndSelectFallback,
    })),
  )

  return (
    <TabsView tabs={tabs} activeTab={activeTab} onSelectTab={setActiveTab} onCloseTab={removeTabAndSelectFallback} />
  )
}
