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

  const handleVisibilityChange = (index: SidebarSide, value: boolean) => {
    setVisible(name, index, value)
  }

  const saveSizes = (newSizes: number[]) => {
    const previous = useSidebarStore.getState().instances[name]?.sizes ?? []
    const merged = newSizes.map((size, i) => (size === 0 ? (previous[i] ?? 0) : size))
    setSizes(name, merged)
  }

  const onChangeHandler = () => {
    if (windowResizeOnChange) {
      globalThis.dispatchEvent(new Event('resize'))
    }
  }

  return (
    <SidebarContext.Provider value={name}>
      {sizes && visible.length > 0 && (
        <Allotment key={name} onChange={onChangeHandler} onDragEnd={saveSizes} onVisibleChange={handleVisibilityChange}>
          <Allotment.Pane
            snap
            minSize={200}
            maxSize={500}
            preferredSize={sizes[SidebarSide.LEFT] || 300}
            visible={visible[SidebarSide.LEFT]}
            className="bg-background flex h-full flex-col"
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
              preferredSize={visible[SidebarSide.RIGHT] ? sizes[SidebarSide.RIGHT] || 500 : undefined}
              visible={visible[SidebarSide.RIGHT]}
              className="bg-background flex h-full flex-col"
            >
              {childrenArray[SidebarSide.RIGHT]}
            </Allotment.Pane>
          )}
        </Allotment>
      )}
    </SidebarContext.Provider>
  )
}
