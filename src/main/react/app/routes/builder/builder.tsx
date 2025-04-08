import { useEffect, useMemo, useState } from 'react'
import { Allotment } from 'allotment'
import Tabs, { type TabsList } from '~/components/tabs/tabs'
import BuilderStructure from '~/routes/builder/builder-structure'
import SidebarIcon from '/icons/solar/Sidebar Minimalistic.svg?react'
import BuilderContext from '~/routes/builder/builder-context'

const tabs = {
  tab1: { value: 'tab1', icon: 'code' },
  tab2: { value: 'tab2' },
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

export default function Builder() {
  const [selectedTab, setSelectedTab] = useState<string | undefined>()

  const [visible, setVisible] = useState([true, true, true])
  const [hasReadFromLocalStorage, setHasReadFromLocalStorage] = useState(false)
  const [sizes, setSizes] = useState<number[]>([])

  const saveSizes = useMemo(
    () => (sizes: number[]) => localStorage.setItem('builderSidebarSizes', JSON.stringify(sizes)),
    [],
  )

  const saveVisible = useMemo(
    () => (visible: boolean[]) => localStorage.setItem('builderSidebarVisible', JSON.stringify(visible)),
    [],
  )

  useEffect(() => {
    const savedSized = localStorage.getItem('builderSidebarSizes')
    const savedVisible = localStorage.getItem('builderSidebarVisible')
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
            <BuilderStructure onClose={toggleLeftVisible} />
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
              {!visible[SidebarIndex.RIGHT] && (
                <div className="flex aspect-square h-12 items-center justify-center border-b border-l border-gray-200">
                  <SidebarIcon
                    onClick={toggleRightVisible}
                    className="fill-gray-950 hover:fill-[var(--color-brand)]"
                  ></SidebarIcon>
                </div>
              )}
            </div>
            <div className="h-12 border-b border-b-gray-200">
              Path: {Object.entries(tabs).find(([key]) => key === selectedTab)?.[1]?.value}
            </div>
            <div className="h-full bg-radial-[2px,transparent_0,var(--color-gray-300),white] bg-[size:40px_40px] bg-[position:-19px_-19px]">
              canvas
            </div>
          </Allotment.Pane>
          <Allotment.Pane
            key="right"
            snap
            minSize={200}
            maxSize={2000}
            preferredSize={300}
            visible={visible[SidebarIndex.RIGHT]}
          >
            <BuilderContext onClose={toggleRightVisible} />
          </Allotment.Pane>
        </Allotment>
      )}
    </>
  )
}
