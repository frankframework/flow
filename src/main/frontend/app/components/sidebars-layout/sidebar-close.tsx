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
  const visibility = useSidebarStore((state) => state.getVisibility(layoutName ?? ''))
  const setVisibility = useSidebarStore((state) => state.setVisibility)
  const isLeft = side === SidebarSide.LEFT

  if (!layoutName) throw new Error('SidebarsClose must be used within a SidebarLayout')

  const toggleVisible = () => {
    setVisibility(layoutName, side, !visibility[side])
  }

  return (
    <SidebarIcon
      onClick={toggleVisible}
      className={clsx('fill-foreground hover:fill-brand cursor-pointer', isLeft && 'rotate-180')}
    ></SidebarIcon>
  )
}
