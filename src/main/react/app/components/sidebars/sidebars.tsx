import React, { useEffect } from 'react'
import { Allotment } from 'allotment'
import { SidebarIndex, useSidebarStore, type VisibilityState } from '~/components/sidebars/sidebars-store'

interface SidebarsProperties {
  sidebarsId: string
  leftSidebar: React.FC
  content: React.FC
  rightSidebar?: React.FC
  defaultVisible?: VisibilityState
}

export default function Sidebars({
  sidebarsId,
  leftSidebar,
  content,
  rightSidebar,
  defaultVisible,
}: Readonly<SidebarsProperties>) {
  const { initializeInstance, setSizes, setVisible, instances } = useSidebarStore()

  // Get sizes and visible state for this instance
  const sizes = instances[sidebarsId]?.sizes || []
  const visible = instances[sidebarsId]?.visible || [true, true, true]

  useEffect(() => {
    initializeInstance(sidebarsId, defaultVisible)
  }, [])

  const onVisibleChangeHandler = (index: SidebarIndex, value: boolean) => {
    setVisible(sidebarsId, index, value)
  }

  const saveSizes = (sizes: number[]) => {
    setSizes(sidebarsId, sizes)
  }

  const LeftSidebar = leftSidebar
  const Content = content
  const RightSidebar = rightSidebar as React.FC | undefined

  return (
    <>
      {instances[sidebarsId] && (
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
            className="flex h-full flex-col"
          >
            <LeftSidebar />
          </Allotment.Pane>
          <Allotment.Pane key="content" className="flex h-full flex-col">
            <Content />
          </Allotment.Pane>
          {RightSidebar && (
            <Allotment.Pane
              key="right"
              snap
              minSize={200}
              maxSize={2000}
              preferredSize={300}
              visible={visible[SidebarIndex.RIGHT]}
              className="flex h-full flex-col"
            >
              <RightSidebar />
            </Allotment.Pane>
          )}
        </Allotment>
      )}
    </>
  )
}
