import { useCallback, useEffect, useRef } from 'react'
import Tab from './tab'
import type { TabData } from '~/stores/tab-store'

interface TabsViewProps<T extends string = string> {
  tabs: Record<T, TabData>
  activeTab: T | null
  onSelectTab: (key: T) => void
  onCloseTab: (key: T) => void
}

export function TabsView<T extends string>({ tabs, activeTab, onSelectTab, onCloseTab }: TabsViewProps<T>) {
  const tabsElementReference = useRef<HTMLDivElement>(null)
  const tabsListReference = useRef<HTMLUListElement>(null)
  const shadowLeftReference = useRef<HTMLDivElement>(null)
  const shadowRightReference = useRef<HTMLDivElement>(null)
  const entries = Object.entries(tabs) as [T, TabData][]

  const calculateScrollShadows = useCallback(() => {
    setTimeout(() => {
      if (
        !tabsElementReference.current ||
        !tabsListReference.current ||
        !shadowLeftReference.current ||
        !shadowRightReference.current
      ) {
        return
      }

      const scrollWidth = tabsListReference.current.scrollWidth - tabsElementReference.current.offsetWidth
      const scrollLeft = tabsListReference.current.scrollLeft
      const currentScroll = scrollWidth > 0 ? scrollLeft / scrollWidth : 0

      setShadows(currentScroll, 1 - currentScroll)
    })
  }, [])

  useEffect(() => {
    calculateScrollShadows()
    window.addEventListener('resize', calculateScrollShadows)
    return () => window.removeEventListener('resize', calculateScrollShadows)
  }, [calculateScrollShadows, tabs])

  useEffect(() => {
    calculateScrollShadows()
    window.addEventListener('resize', calculateScrollShadows)
    return () => {
      window.removeEventListener('resize', calculateScrollShadows)
    }
  }, [tabs, calculateScrollShadows])

  const setShadows = (left: number, right: number) => {
    if (shadowLeftReference.current) {
      shadowLeftReference.current.style.opacity = left.toString()
    }
    if (shadowRightReference.current) {
      shadowRightReference.current.style.opacity = right.toString()
    }
  }

  return (
    <div ref={tabsElementReference} className="relative flex h-12">
      <div
        ref={shadowLeftReference}
        className="absolute top-0 bottom-0 left-0 z-10 w-2 bg-gradient-to-r from-black/15 to-transparent opacity-0"
      />
      <div
        ref={shadowRightReference}
        className="absolute top-0 right-0 bottom-0 z-10 w-2 bg-gradient-to-l from-black/15 to-transparent opacity-0"
      />

      <ul ref={tabsListReference} className="m-0 flex rotate-x-180 flex-nowrap overflow-x-auto p-0 whitespace-nowrap">
        {entries.map(([key, tab]) => (
          <Tab
            key={key}
            name={tab.name}
            configurationPath={tab.configurationPath}
            isSelected={activeTab === key}
            onSelect={() => onSelectTab(key as T)}
            onClose={() => onCloseTab(key as T)}
            icon={tab.icon}
          />
        ))}
      </ul>

      <div className="bg-background border-b-border flex-grow border-b" />
    </div>
  )
}
