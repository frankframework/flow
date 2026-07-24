import React, { createContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Allotment, type AllotmentHandle } from 'allotment'
import { SidebarSide, useSidebarStore, type VisibilityState } from '~/components/sidebars-layout/sidebar-layout-store'

export const SidebarContext = createContext<string | undefined>(undefined)

type SidebarLayoutProperties = {
  children: React.ReactNode
  name: string
  defaultVisible?: VisibilityState
  windowResizeOnChange?: boolean
  hideLeft?: boolean
}

export default function SidebarLayout({
  children,
  name,
  defaultVisible,
  windowResizeOnChange,
  hideLeft,
}: Readonly<SidebarLayoutProperties>): React.JSX.Element {
  const initializeInstance = useSidebarStore(
    (state): ((name: string, defaultVisible?: VisibilityState) => void) => state.initializeInstance,
  )
  const setSizes = useSidebarStore((state): ((name: string, sizes: number[]) => void) => state.setSizes)
  const setVisible = useSidebarStore(
    (state): ((name: string, side: SidebarSide, value: boolean) => void) => state.setVisible,
  )
  const sizesRaw = useSidebarStore((state): number[] | undefined => state.getSizes(name))
  const visibleRaw = useSidebarStore((state): VisibilityState | undefined => state.getVisibility(name))
  const sizes = useMemo((): number[] => sizesRaw ?? [], [sizesRaw])
  const visible = useMemo<VisibilityState>(
    (): VisibilityState => visibleRaw ?? defaultVisible ?? [true, true, true],
    [visibleRaw, defaultVisible],
  )
  const childrenArray = React.Children.toArray(children)
  const allotmentReference = useRef<AllotmentHandle>(null)
  const [allotmentReady, setAllotmentReady] = useState(false)

  useEffect((): void => {
    initializeInstance(name, defaultVisible)
  }, [initializeInstance, name, defaultVisible])

  useLayoutEffect((): void => {
    if (!allotmentReady || !allotmentReference.current) return
    if (sizes.length === 0) return

    const target = sizes.map((size, index): number => (Object.hasOwn(visible, index) ? size : 0))
    if (hideLeft) target.shift()
    allotmentReference.current.resize(target)
  }, [sizes, visible, allotmentReady, hideLeft])

  const handleVisibilityChange = (index: SidebarSide, value: boolean): void => {
    setVisible(name, index, value)
  }

  const saveSizes = (newSizes: number[]): void => {
    const previous = useSidebarStore.getState().getSizes(name) ?? []
    const merged = newSizes.map((size, index): number => (size === 0 ? (previous[index] ?? 0) : size))
    setSizes(name, merged)
    if (windowResizeOnChange) {
      globalThis.dispatchEvent(new Event('resize'))
    }
  }

  const onChangeHandler = (): void => {
    if (!allotmentReady) setAllotmentReady(true)
  }

  return (
    <SidebarContext.Provider value={name}>
      {sizes && visible.length > 0 && (
        <Allotment
          key={name}
          ref={allotmentReference}
          onChange={onChangeHandler}
          onDragEnd={saveSizes}
          onVisibleChange={handleVisibilityChange}
          proportionalLayout={false}
        >
          {hideLeft || (
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
          )}
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
