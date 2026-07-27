import { type JSX, useCallback, useEffect, useRef } from 'react'
import Tab from './tab'
import type { TabData } from '~/stores/tab-store'

type TabsViewProperties<T extends string = string> = {
  tabs: Record<T, TabData>
  activeTab: T | null
  onSelectTab: (key: T) => void
  onCloseTab: (key: T) => void
}

export function TabsView<T extends string>({
  tabs,
  activeTab,
  onSelectTab,
  onCloseTab,
}: TabsViewProperties<T>): JSX.Element {
  const tabsListReference = useRef<HTMLUListElement>(null)
  const shadowLeftReference = useRef<HTMLDivElement>(null)
  const shadowRightReference = useRef<HTMLDivElement>(null)
  const entries = Object.entries(tabs) as [T, TabData][]

  const calculateScrollShadows = useCallback((): void => {
    if (!tabsListReference.current || !shadowLeftReference.current || !shadowRightReference.current) return

    const { scrollWidth, clientWidth, scrollLeft } = tabsListReference.current

    if (scrollWidth <= clientWidth) {
      setShadows(0, 0)
      return
    }

    const maxScroll = scrollWidth - clientWidth
    const currentScroll = scrollLeft / maxScroll
    setShadows(currentScroll, 1 - currentScroll)
  }, [])

  useEffect((): (() => void) => {
    calculateScrollShadows()

    const resizeObserver = new ResizeObserver(calculateScrollShadows)
    if (tabsListReference.current) resizeObserver.observe(tabsListReference.current)

    return (): void => resizeObserver.disconnect()
  }, [calculateScrollShadows, tabs])

  const setShadows = (left: number, right: number): void => {
    if (shadowLeftReference.current) {
      shadowLeftReference.current.style.opacity = left.toString()
    }
    if (shadowRightReference.current) {
      shadowRightReference.current.style.opacity = right.toString()
    }
  }

  return (
    <div className="relative flex h-12">
      <div
        ref={shadowLeftReference}
        className="from-foreground/20 absolute top-0 bottom-0 left-0 z-10 w-2 bg-gradient-to-r to-transparent opacity-0"
      />
      <div
        ref={shadowRightReference}
        className="from-foreground/20 absolute top-0 right-0 bottom-0 z-10 w-2 bg-gradient-to-l to-transparent opacity-0"
      />

      <ul
        ref={tabsListReference}
        style={{ scrollbarWidth: 'none' }}
        className="m-0 flex rotate-x-180 flex-nowrap overflow-x-auto p-0 whitespace-nowrap [&::-webkit-scrollbar]:hidden"
        onScroll={calculateScrollShadows}
      >
        {entries.map(([key, tab]): JSX.Element => (
          <Tab
            key={key}
            name={tab.name}
            configurationPath={tab.configurationPath}
            isSelected={activeTab === key}
            onSelect={(): void => onSelectTab(key as T)}
            onClose={(): void => onCloseTab(key as T)}
            icon={tab.icon}
          />
        ))}
      </ul>

      <div className="bg-background border-b-border flex-grow border-b" />
    </div>
  )
}
