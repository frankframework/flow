import Tabs from '~/components/tabs/tabs'
import { Editor } from '@monaco-editor/react'
import EditorFiles from '~/routes/editor/editor-files'
import SidebarHeader from '~/components/sidebars-layout/sidebar-header'
import SidebarLayout from '~/components/sidebars-layout/sidebar-layout'
import { SidebarSide } from '~/components/sidebars-layout/sidebar-layout-store'
import SidebarContentClose from '~/components/sidebars-layout/sidebar-content-close'
import useTabStore from '~/stores/tab-store'

export default function CodeEditor() {
  const activeTab = useTabStore((state) => state.activeTab)

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
            <Tabs />
          </div>
        </div>
        <div className="h-12 border-b border-b-gray-200">
          Path: {activeTab}
        </div>
        <div className="h-full">
          <Editor></Editor>
        </div>
      </>
      <>
        <SidebarHeader side={SidebarSide.RIGHT} title="Preview" />
        <div className="h-full">Preview</div>
      </>
    </SidebarLayout>
  )
}
