import { useState } from 'react'
import Tabs, { type TabsList } from '~/components/tabs/tabs'
import { Editor } from '@monaco-editor/react'
import EditorFiles from '~/routes/editor/editor-files'
import FolderIcon from '/icons/solar/Folder.svg?react'
import SidebarsHeader from '~/components/sidebars/sidebars-header'
import Sidebars from '~/components/sidebars/sidebars'
import { SidebarIndex } from '~/components/sidebars/sidebars-store'
import SidebarsContentClose from '~/components/sidebars/sidebars-content-close'

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

const SIDEBARS_ID = 'editor'

export default function CodeEditor() {
  const [selectedTab, setSelectedTab] = useState<string | undefined>()

  const LeftSidebar = () => (
    <>
      <SidebarsHeader sidebarId={SIDEBARS_ID} index={SidebarIndex.LEFT} title="Files" />
      <EditorFiles></EditorFiles>
    </>
  )

  const Content = () => (
    <>
      <div className="flex">
        <SidebarsContentClose sidebarId={SIDEBARS_ID} index={SidebarIndex.LEFT} />
        <div className="grow overflow-x-auto">
          <Tabs onSelectedTabChange={setSelectedTab} initialTabs={tabs} />
        </div>
      </div>
      <div className="h-12 border-b border-b-gray-200">
        Path: {Object.entries(tabs).find(([key]) => key === selectedTab)?.[1]?.value}
      </div>
      <div className="h-full">
        <Editor></Editor>
      </div>
      )
    </>
  )

  return <Sidebars sidebarsId={SIDEBARS_ID} leftSidebar={LeftSidebar} content={Content} windowResizeOnChange={true} />
}
