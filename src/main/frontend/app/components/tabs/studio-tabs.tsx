import { useShallow } from 'zustand/react/shallow'
import useTabStore from '~/stores/tab-store'
import { TabsView } from './tabs'

export default function StudioTabs(): JSX.Element {
  const { tabs, activeTab, setActiveTab, removeTabAndSelectFallback } = useTabStore(
    useShallow(
      (
        state,
      ): {
        tabs: Record<string, TabData>
        activeTab: string
        setActiveTab: (tabId: string | undefined) => void
        removeTabAndSelectFallback: (tabId: string) => void
      } => ({
        tabs: state.tabs,
        activeTab: state.activeTab,
        setActiveTab: state.setActiveTab,
        removeTabAndSelectFallback: state.removeTabAndSelectFallback,
      }),
    ),
  )

  return (
    <TabsView tabs={tabs} activeTab={activeTab} onSelectTab={setActiveTab} onCloseTab={removeTabAndSelectFallback} />
  )
}
