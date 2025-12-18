import React, { createContext, useEffect } from 'react'
import { Allotment } from 'allotment'
import { SidebarSide, useSidebarStore, type VisibilityState } from '~/components/sidebars-layout/sidebar-layout-store'

export const SidebarContext = createContext<string | undefined>(undefined)

interface SidebarLayoutProperties {
  children: React.ReactNode
  name: string
  defaultVisible?: VisibilityState
  windowResizeOnChange?: boolean
}

export default function SidebarLayout({
  children,
  name,
  defaultVisible,
  windowResizeOnChange,
}: Readonly<SidebarLayoutProperties>) {
  const { initializeInstance, setSizes, setVisible } = useSidebarStore()
  const sizes = useSidebarStore((state) => state.instances[name]?.sizes) ?? []
  const visible = useSidebarStore((state) => state.instances[name]?.visible) ?? []
  const childrenArray = React.Children.toArray(children)

  useEffect(() => {
    initializeInstance(name, defaultVisible)
  }, [initializeInstance, name, defaultVisible])

  const saveVisible = (index: SidebarSide, value: boolean) => {
    setVisible(name, index, value)
  }

  const saveSizes = (sizes: number[]) => {
    setSizes(name, sizes)
  }

  const onChangeHandler = () => {
    if (windowResizeOnChange) {
      globalThis.dispatchEvent(new Event('resize'))
    }
  }

  return (
    <SidebarContext.Provider value={name}>
      {sizes && visible && (
        <Allotment onChange={onChangeHandler} onDragEnd={saveSizes} onVisibleChange={saveVisible} defaultSizes={sizes}>
          <Allotment.Pane
            snap
            minSize={200}
            maxSize={500}
            preferredSize={300}
            visible={visible[SidebarSide.LEFT]}
            className="flex h-full flex-col"
          >
            {childrenArray[SidebarSide.LEFT]}
          </Allotment.Pane>
          <Allotment.Pane className="bg-backdrop flex h-full flex-col">
            {childrenArray[SidebarSide.MIDDLE]}
          </Allotment.Pane>
          {childrenArray[SidebarSide.RIGHT] && (
            <Allotment.Pane
              snap
              minSize={200}
              maxSize={1000}
              preferredSize={500}
              visible={visible[SidebarSide.RIGHT]}
              className="flex h-full flex-col"
            >
              {childrenArray[SidebarSide.RIGHT]}
            </Allotment.Pane>
          )}
        </Allotment>
      )}
    </SidebarContext.Provider>
  )
}
