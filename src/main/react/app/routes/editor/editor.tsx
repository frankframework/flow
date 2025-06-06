import Tabs, {type TabsList} from '~/components/tabs/tabs'
import Editor from '@monaco-editor/react'
import EditorFiles from '~/routes/editor/editor-files'
import SidebarHeader from '~/components/sidebars-layout/sidebar-header'
import SidebarLayout from '~/components/sidebars-layout/sidebar-layout'
import { SidebarSide } from '~/components/sidebars-layout/sidebar-layout-store'
import SidebarContentClose from '~/components/sidebars-layout/sidebar-content-close'
import useTabStore from '~/stores/tab-store'
import { useTheme } from '~/hooks/use-theme'
import {useEffect, useState} from "react";

export default function CodeEditor() {
  const theme = useTheme()
  const [tabs, setTabs] = useState<TabsList>(useTabStore.getState().tabs as TabsList)
  const [activeTab, setActiveTab] = useState<string | undefined>(useTabStore.getState().activeTab)

  useEffect(() => {
    const unsubTabs = useTabStore.subscribe((state) => {
      setTabs(state.tabs as TabsList)
    })
    const unsubActiveTab = useTabStore.subscribe(
      (state) => state.activeTab,
      (newActiveTab) => {
        setActiveTab(newActiveTab)
      },
    )
    return () => {
      unsubTabs()
      unsubActiveTab()
    }
  }, [])

  const handleSelectTab = (key: string) => {
    useTabStore.getState().setActiveTab(key)
  }

  const handleCloseTab = (key: string, event?: React.MouseEvent) => {
    event?.stopPropagation()
    useTabStore.getState().removeTab(key)

    // Auto-select fallback if the closed tab was active
    if (key === activeTab) {
      const remainingTabs = Object.keys(useTabStore.getState().tabs)
      if (remainingTabs.length > 0) {
        useTabStore.getState().setActiveTab(remainingTabs[0])
      } else {
        useTabStore.getState().setActiveTab(undefined)
      }
    }
  }

  return (
    <SidebarLayout name="editor" windowResizeOnChange={true}>
      <>
        <SidebarHeader side={SidebarSide.LEFT} title="Files" />
        <EditorFiles />
      </>
      <>
        <div className="flex">
          <SidebarContentClose side={SidebarSide.LEFT} />
          <div className="grow overflow-x-auto">
            <Tabs tabs={tabs} selectedTab={activeTab} onSelectTab={handleSelectTab} onCloseTab={handleCloseTab} />
          </div>
        </div>
        <div className="border-b-border bg-background flex h-12 items-center border-b p-4">Path: {activeTab}</div>
        <div className="h-full">
          <Editor language="xml" theme={`vs-${theme}`} />
        </div>
      </>
      <>
        <SidebarHeader side={SidebarSide.RIGHT} title="Preview" />
        <div className="h-full">Preview</div>
      </>
    </SidebarLayout>
  )
}
