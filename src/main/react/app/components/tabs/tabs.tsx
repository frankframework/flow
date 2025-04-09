import React, { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import CloseSquareIcon from '/icons/solar/Close Square.svg?react'
import CodeIcon from '/icons/solar/Code.svg?react'
import Tab from '~/components/tabs/tab'

export type TabsList = Record<string, TabsItem>

export interface TabsItem {
  value: string
  icon?: React.FC<React.SVGProps<SVGSVGElement>>
}

export interface TabsProperties {
  initialTabs: TabsList
  initialSelectedTab?: string
  onSelectedTabChange: (tabKey: string) => void
}

export default function Tabs({ initialTabs, initialSelectedTab, onSelectedTabChange }: Readonly<TabsProperties>) {
  const [tabs, setTabs] = useState<TabsList>(initialTabs)
  const [selectedTab, setSelectedTab] = useState<string | undefined>(initialSelectedTab)
  const [selectedTabHistory, setSelectedTabHistory] = useState<string[]>([])
  const tabsElementReference = useRef<HTMLDivElement>(null)
  const tabsListElementReference = useRef<HTMLUListElement>(null)
  const shadowLeftElementReference = useRef<HTMLDivElement>(null)
  const shadowRightElementReference = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!selectedTab) {
      setPreselectedTab()
    }
    globalThis.addEventListener('resize', calculateScrollShadows)
    return () => {
      globalThis.removeEventListener('resize', calculateScrollShadows)
    }
  }, [])

  useEffect(() => {
    calculateScrollShadows()
  }, [tabs])

  const setPreselectedTab = () => {
    if (Object.keys(tabs).length > 0) {
      const firstTab = Object.keys(tabs)[0]
      selectTab(firstTab)
    }
  }

  const selectTab = (key: string) => {
    setSelectedTab(key)
    setSelectedTabHistory([...selectedTabHistory, key])
    onSelectedTabChange(key)
  }

  const closeTab = (key: string, event?: React.MouseEvent) => {
    event?.stopPropagation()

    delete tabs[key]
    setTabs({ ...tabs })

    if (key === selectedTab) {
      setSelectedTab(undefined)
      selectPreviousTab()
    }

    calculateScrollShadows()
  }

  const selectPreviousTab = () => {
    const previousTab = selectedTabHistory.pop()
    setSelectedTabHistory([...selectedTabHistory])

    if (!previousTab) {
      setPreselectedTab()
      return
    }

    if (tabIsSelectable(previousTab)) {
      selectTab(previousTab)
    } else {
      selectPreviousTab()
    }
  }

  const tabIsSelectable = (key: string) => {
    return Object.keys(tabs).includes(key) && key !== selectedTab
  }

  const calculateScrollShadows = () => {
    setTimeout(() => {
      if (
        !tabsElementReference.current ||
        !tabsListElementReference.current ||
        !shadowLeftElementReference.current ||
        !shadowRightElementReference.current
      ) {
        return
      }

      const scrollWidth = tabsListElementReference.current.scrollWidth - tabsElementReference.current.offsetWidth
      let currentScroll = tabsListElementReference.current.scrollLeft / scrollWidth

      if (scrollWidth <= 0) {
        setShadows(0, 0)
      } else {
        setShadows(currentScroll, 1 - currentScroll)
      }
    })
  }

  const setShadows = (left: number, right: number) => {
    if (shadowLeftElementReference.current && shadowRightElementReference.current) {
      shadowLeftElementReference.current.style.opacity = left.toString()
      shadowRightElementReference.current.style.opacity = right.toString()
    }
  }

  const handleWheel = () => {
    calculateScrollShadows()
  }

  return (
    <div ref={tabsElementReference} className="relative flex h-12" onWheel={handleWheel}>
      <div
        ref={shadowLeftElementReference}
        className="absolute top-0 bottom-0 left-0 z-10 w-2 bg-gradient-to-r from-black/15 to-transparent opacity-0"
      ></div>
      <div
        ref={shadowRightElementReference}
        className="absolute top-0 right-0 bottom-0 z-10 w-2 bg-gradient-to-l from-black/15 to-transparent opacity-0"
      ></div>

      <ul
        ref={tabsListElementReference}
        className="m-0 flex rotate-x-180 flex-nowrap overflow-x-auto p-0 whitespace-nowrap"
      >
        {Object.entries(tabs).map(([key, tab]) => (
          <Tab
            key={key}
            value={tab.value}
            isSelected={selectedTab === key}
            onSelect={() => selectTab(key)}
            onClose={(event) => closeTab(key, event)}
            icon={tab.icon}
          />
        ))}
      </ul>
      <div className="flex-grow border-b border-b-gray-200"></div>
    </div>
  )
}
