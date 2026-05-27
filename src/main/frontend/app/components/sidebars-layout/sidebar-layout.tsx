import React, { createContext } from 'react'
import { Allotment } from 'allotment'
import { SidebarSide, useSidebarStore } from '~/components/sidebars-layout/sidebar-layout-store'

export const SidebarContext = createContext<string | undefined>(undefined)

interface SidebarLayoutProperties {
  children: React.ReactNode
  name: string
}

export default function SidebarLayout({ children, name }: Readonly<SidebarLayoutProperties>) {
  const visible = useSidebarStore((state) => state.getVisibility(name))
  const setVisibility = useSidebarStore((state) => state.setVisibility)
  const childrenArray = React.Children.toArray(children)

  const handleVisibilityChange = (index: SidebarSide, value: boolean) => {
    setVisibility(name, index, value)
  }

  return (
    <SidebarContext.Provider value={name}>
      <Allotment key={name} onVisibleChange={handleVisibilityChange}>
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
    </SidebarContext.Provider>
  )
}
