import React, { useEffect, useMemo, useState } from 'react'
import { Allotment } from 'allotment'
import SidebarIcon from '/icons/solar/Sidebar Minimalistic.svg?react'
import '/styles/markdown.css'
import helpTopicTreeItems, { type HelpTopicTreeItem } from './help-topic-tree-items'
import { useParams } from 'react-router'
import HelpTopics from '~/routes/help/help-topics'

enum SidebarIndex {
  LEFT = 0,
  RIGHT = 2,
}

const LOCAL_STORAGE_SIZES_KEY = 'helpSidebarSizes'
const LOCAL_STORAGE_VISIBLE_KEY = 'helpSidebarVisible'

const firstTopic = Object.keys(helpTopicTreeItems)[1]

export default function Help() {
  const { topic } = useParams<{ topic?: string }>()
  const helpTopicKey = topic ?? firstTopic
  const helpTopic: HelpTopicTreeItem | undefined = helpTopicTreeItems[helpTopicKey]

  const [visible, setVisible] = useState([true, true, true])
  const [hasReadFromLocalStorage, setHasReadFromLocalStorage] = useState(false)
  const [sizes, setSizes] = useState<number[]>([])

  const saveSizes = useMemo(
    () => (sizes: number[]) => localStorage.setItem(LOCAL_STORAGE_SIZES_KEY, JSON.stringify(sizes)),
    [],
  )

  const saveVisible = useMemo(
    () => (visible: boolean[]) => localStorage.setItem(LOCAL_STORAGE_VISIBLE_KEY, JSON.stringify(visible)),
    [],
  )

  useEffect(() => {
    const savedSized = localStorage.getItem(LOCAL_STORAGE_SIZES_KEY)
    const savedVisible = localStorage.getItem(LOCAL_STORAGE_VISIBLE_KEY)
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
            <HelpTopics selectedTopic={helpTopicKey} onClose={toggleLeftVisible} />
          </Allotment.Pane>
          <Allotment.Pane key="content" className="flex flex-col">
            <div className="flex h-12">
              {!visible[SidebarIndex.LEFT] && (
                <div className="flex aspect-square items-center justify-center border-r border-b border-gray-200">
                  <SidebarIcon
                    onClick={toggleLeftVisible}
                    className="rotate-180 fill-gray-950 hover:fill-[var(--color-brand)]"
                  ></SidebarIcon>
                </div>
              )}
              <div className="flex grow items-center border-b border-b-gray-200 px-4">
                <div className="flex h-max items-end gap-4">
                  <h1 className="text-xl font-medium">{helpTopic?.data.title ?? 'Oops'}</h1>
                  <p>{helpTopic?.data.description ?? "Topic can't be retrieved"}</p>
                </div>
              </div>
              {!visible[SidebarIndex.RIGHT] && (
                <div className="flex aspect-square items-center justify-center border-b border-l border-gray-200">
                  <SidebarIcon
                    onClick={toggleRightVisible}
                    className="fill-gray-950 hover:fill-[var(--color-brand)]"
                  ></SidebarIcon>
                </div>
              )}
            </div>
            <div className="markdown-body h-full overflow-auto p-4">
              {React.createElement(
                helpTopic?.data.content ??
                  (() => (
                    <div>
                      The topic with id: <code>{topic}</code> does not seem to exist, it might have been moved or
                      deleted. Please select a different topic from the left sidebar.
                    </div>
                  )),
              )}
            </div>
          </Allotment.Pane>
        </Allotment>
      )}
    </>
  )
}
