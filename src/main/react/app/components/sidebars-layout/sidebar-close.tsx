import SidebarIcon from '/icons/solar/Sidebar Minimalistic.svg?react'
import { SidebarSide, useSidebarStore } from '~/components/sidebars-layout/sidebar-layout-store'
import clsx from 'clsx'
import { useContext } from 'react'
import { SidebarContext } from '~/components/sidebars-layout/sidebar-layout'

export interface SidebarsCloseProperties {
  side: SidebarSide
}

export default function SidebarClose({ side }: Readonly<SidebarsCloseProperties>) {
  const layoutName = useContext(SidebarContext)
  const { toggleSidebar } = useSidebarStore()
  const isLeft = side === SidebarSide.LEFT

  if (!layoutName) throw new Error('SidebarsClose must be used within a SidebarLayout or be provided a layoutName prop')

  const toggleVisible = () => {
    toggleSidebar(layoutName, side)
  }

  return (
    <SidebarIcon
      onClick={toggleVisible}
      className={clsx('fill-foreground hover:fill-brand', isLeft && 'rotate-180')}
    ></SidebarIcon>
  )
}
