import React, { useEffect, createContext, useContext } from 'react'
import { Allotment } from 'allotment'
import { SidebarSide, useSidebarStore, type VisibilityState } from '~/components/sidebars-layout/sidebar-layout-store'

export const SidebarContext = createContext<string | undefined>(undefined)

interface SidebarsProperties {
  children: React.ReactNode
  name: string
  defaultVisible?: VisibilityState
  windowResizeOnChange?: boolean
}

interface SidebarProperties {
  children: React.ReactNode
}

type GenericSidebarProperties = {
  side: SidebarSide
} & SidebarProperties

function SidebarLayout({ children, name, defaultVisible, windowResizeOnChange }: Readonly<SidebarsProperties>) {
  const { initializeInstance, setSizes, setVisible, instances } = useSidebarStore()

  const sizes = instances[name]?.sizes || []

  useEffect(() => {
    initializeInstance(name, defaultVisible)
  }, [])

  const onVisibleChangeHandler = (index: SidebarSide, value: boolean) => {
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
      {instances[name] && (
        <Allotment
          onChange={() => onChangeHandler()}
          onDragEnd={saveSizes}
          defaultSizes={sizes}
          onVisibleChange={(index, value) => onVisibleChangeHandler(index, value)}
        >
          {children}
        </Allotment>
      )}
    </SidebarContext.Provider>
  )
}

function Sidebar({ children, side }: Readonly<GenericSidebarProperties>) {
  const layoutName = useContext(SidebarContext)

  if (!layoutName) {
    throw new Error('Sidebar must be used within a SidebarLayout or be provided a layoutName prop')
  }

  const isVisible = useSidebarStore((state) => state.instances[layoutName].visible[side])

  return (
    <Allotment.Pane
      snap
      minSize={200}
      maxSize={500}
      preferredSize={300}
      visible={isVisible}
      className="flex h-full flex-col"
    >
      {isVisible ? 'visible' : 'not visible'}
      {children}
    </Allotment.Pane>
  )
}

SidebarLayout.Left = function Left({ children }: Readonly<SidebarProperties>) {
  return <Sidebar side={SidebarSide.LEFT}>{children}</Sidebar>
}

SidebarLayout.Right = function RightSidebar({ children }: Readonly<SidebarProperties>) {
  return <Sidebar side={SidebarSide.RIGHT}>{children}</Sidebar>
}

SidebarLayout.Content = function Content({ children }: Readonly<SidebarProperties>) {
  return <Allotment.Pane className="flex h-full flex-col">{children}</Allotment.Pane>
}

export { SidebarLayout }
export default SidebarLayout
