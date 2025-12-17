import { useShallow } from 'zustand/react/shallow'
import useEditorTabStore from '~/stores/editor-tab-store'
import { TabsView } from './tabs'

export default function EditorTabs() {
  const { tabs, activeTab, setActiveTab, removeTabAndSelectFallback } = useEditorTabStore(
    useShallow((state) => ({
      tabs: state.tabs,
      activeTab: state.activeTabFilePath,
      setActiveTab: state.setActiveTab,
      removeTabAndSelectFallback: state.removeTabAndSelectFallback,
    })),
  )

  return (
    <TabsView tabs={tabs} activeTab={activeTab} onSelectTab={setActiveTab} onCloseTab={removeTabAndSelectFallback} />
  )
}

