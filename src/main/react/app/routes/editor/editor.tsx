import { useState } from 'react'
import Tabs, { type TabsList } from '~/components/tabs/tabs'
import Editor, {  useMonaco } from '@monaco-editor/react'
import EditorFiles from '~/routes/editor/editor-files'
import FolderIcon from '/icons/solar/Folder.svg?react'
import SidebarHeader from '~/components/sidebars-layout/sidebar-header'
import SidebarLayout from '~/components/sidebars-layout/sidebar-layout'
import { SidebarSide } from '~/components/sidebars-layout/sidebar-layout-store'
import SidebarContentClose from '~/components/sidebars-layout/sidebar-content-close'
import { useSettingsStore } from '~/routes/settings/settings-store'

const tabs = {
  tab1: { value: 'tab1', icon: FolderIcon },
  tab2: { value: 'tab2', icon: FolderIcon },
  tab3: { value: 'tab3' },
  tab4: { value: 'tab4' },
  tab5: { value: 'tab5' },
  tab6: { value: 'tab6' },
  tab7: { value: 'tab7' },
  tab8: { value: 'tab8' },
  tab9: { value: 'tab9' },
  tab10: { value: 'tab10' },
} as TabsList

export default function CodeEditor() {
  const monaco = useMonaco();
  const [selectedTab, setSelectedTab] = useState<string | undefined>()
  const theme  = useSettingsStore(state => state.general.theme)
  const monacoTheme = theme === 'light'  ? 'vs-dark' : 'vs-light'

  return (
    <SidebarLayout name="editor" windowResizeOnChange={true}>
      <>
        <SidebarHeader side={SidebarSide.LEFT} title="Files" />
        <EditorFiles></EditorFiles>
      </>
      <>
        <div className="flex">
          <SidebarContentClose side={SidebarSide.LEFT} />
          <div className="grow overflow-x-auto">
            <Tabs onSelectedTabChange={setSelectedTab} initialTabs={tabs} />
          </div>
        </div>
        <div className="border-b-border h-12 border-b">
          Path: {Object.entries(tabs).find(([key]) => key === selectedTab)?.[1]?.value}
        </div>
        <div className="h-full">
          <Editor language="xml" theme={monacoTheme}></Editor>
        </div>
      </>
      <>
        <SidebarHeader side={SidebarSide.RIGHT} title="Preview" />
        <div className="h-full">Preview</div>
      </>
    </SidebarLayout>
  )
}
