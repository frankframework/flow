import React, { createContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Allotment, type AllotmentHandle } from 'allotment'
import { SidebarSide, useSidebarStore, type VisibilityState } from '~/stores/sidebar-layout-store'

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
  const initializeInstance = useSidebarStore((state) => state.initializeInstance)
  const setSizes = useSidebarStore((state) => state.setSizes)
  const setVisible = useSidebarStore((state) => state.setVisible)
  const sizesRaw = useSidebarStore((state) => state.getSizes(name))
  const visibleRaw = useSidebarStore((state) => state.getVisibility(name))
  const sizes = useMemo(() => sizesRaw ?? [], [sizesRaw])
  const visible = useMemo<VisibilityState>(
    () => visibleRaw ?? defaultVisible ?? [true, true, true],
    [visibleRaw, defaultVisible],
  )
  const childrenArray = React.Children.toArray(children)
  const allotmentRef = useRef<AllotmentHandle>(null)
  const [allotmentReady, setAllotmentReady] = useState(false)

  useEffect(() => {
    initializeInstance(name, defaultVisible)
  }, [initializeInstance, name, defaultVisible])

  useLayoutEffect(() => {
    if (!allotmentReady || !allotmentRef.current) return
    if (sizes.length === 0) return

    const target = sizes.map((size, i) => (visible[i] ? size : 0))

    allotmentRef.current.resize(target)
  }, [sizes, visible, allotmentReady])

  const handleVisibilityChange = (index: SidebarSide, value: boolean) => {
    setVisible(name, index, value)
  }

  const saveSizes = (newSizes: number[]) => {
    const previous = useSidebarStore.getState().getSizes(name) ?? []
    const merged = newSizes.map((size, i) => (size === 0 ? (previous[i] ?? 0) : size))
    setSizes(name, merged)
  }

  const onChangeHandler = () => {
    if (!allotmentReady) setAllotmentReady(true)
    if (windowResizeOnChange) {
      globalThis.dispatchEvent(new Event('resize'))
    }
  }

  return (
    <SidebarContext.Provider value={name}>
      {sizes && visible.length > 0 && (
        <Allotment
          key={name}
          ref={allotmentRef}
          onChange={onChangeHandler}
          onDragEnd={saveSizes}
          onVisibleChange={handleVisibilityChange}
        >
          <Allotment.Pane
            snap
            minSize={200}
            maxSize={500}
            preferredSize={300}
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
              preferredSize={300}
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
