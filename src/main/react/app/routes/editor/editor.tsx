import { useEffect, useMemo, useState } from 'react'
import { Allotment } from 'allotment'
import Tabs, { type TabsList } from '~/components/tabs/tabs'
import SidebarIcon from '/icons/solar/Sidebar Minimalistic.svg?react'
import { Editor } from '@monaco-editor/react'
import EditorFiles from '~/routes/editor/editor-files'
import FolderIcon from '/icons/solar/Folder.svg?react'

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

enum SidebarIndex {
  LEFT = 0,
  RIGHT = 2,
}

const onChangeHandler = () => {
  globalThis.dispatchEvent(new Event('resize'))
}

export default function CodeEditor() {
  const [selectedTab, setSelectedTab] = useState<string | undefined>()

  const [visible, setVisible] = useState([true, true, true])
  const [hasReadFromLocalStorage, setHasReadFromLocalStorage] = useState(false)
  const [sizes, setSizes] = useState<number[]>([])

  const saveSizes = useMemo(
    () => (sizes: number[]) => localStorage.setItem('editorSidebarSizes', JSON.stringify(sizes)),
    [],
  )

  const saveVisible = useMemo(
    () => (visible: boolean[]) => localStorage.setItem('editorSidebarVisible', JSON.stringify(visible)),
    [],
  )

  useEffect(() => {
    const savedSized = localStorage.getItem('editorSidebarSizes')
    const savedVisible = localStorage.getItem('editorSidebarVisible')
    if (savedSized) {
      setSizes(JSON.parse(savedSized))
    }
    if (savedVisible) {
      setVisible(JSON.parse(savedVisible))
    }
    setHasReadFromLocalStorage(true)
  }, [])

  const onVisibleChangeHandler = (index: SidebarIndex, value: boolean) => {
    visible[index] = value
    setVisible([...visible])
    saveVisible(visible)
  }

  const toggleLeftVisible = () => {
    toggleIndexVisible(SidebarIndex.LEFT)
  }

  const toggleRightVisible = () => {
    toggleIndexVisible(SidebarIndex.RIGHT)
  }

  const toggleIndexVisible = (index: SidebarIndex) => {
    onVisibleChangeHandler(index, !visible[index])
  }

  return (
    <>
      {hasReadFromLocalStorage && (
        <Allotment
          onChange={() => onChangeHandler()}
          onDragEnd={saveSizes}
          defaultSizes={sizes}
          onVisibleChange={(index, value) => onVisibleChangeHandler(index, value)}
        >
          <Allotment.Pane
            key="left"
            snap
            minSize={200}
            maxSize={500}
            preferredSize={300}
            visible={visible[SidebarIndex.LEFT]}
          >
            <EditorFiles onClose={toggleLeftVisible}></EditorFiles>
          </Allotment.Pane>
          <Allotment.Pane key="content">
            <div className="flex">
              {!visible[SidebarIndex.LEFT] && (
                <div className="flex aspect-square h-12 items-center justify-center border-r border-b border-gray-200">
                  <SidebarIcon
                    onClick={toggleLeftVisible}
                    className="rotate-180 fill-gray-950 hover:fill-[var(--color-brand)]"
                  ></SidebarIcon>
                </div>
              )}
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
          </Allotment.Pane>
        </Allotment>
      )}
    </>
  )
}
