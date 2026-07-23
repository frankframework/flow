import SidebarIcon from '/icons/solar/Sidebar Minimalistic.svg?react'
import { SidebarSide, useSidebarStore } from '~/components/sidebars-layout/sidebar-layout-store'
import clsx from 'clsx'
import { type JSX, useContext } from 'react'
import { SidebarContext } from '~/components/sidebars-layout/sidebar-layout'
import IconButton from '~/components/inputs/icon-button'

export type SidebarsCloseProperties = {
  side: SidebarSide
}

export default function SidebarClose({ side }: Readonly<SidebarsCloseProperties>): JSX.Element {
  const layoutName = useContext(SidebarContext)
  if (!layoutName) throw new Error('SidebarClose must be used within a SidebarLayout')

  const toggleSidebar = useSidebarStore((state): ((name: string, side: SidebarSide) => void) => state.toggleSidebar)
  const isLeft = side === SidebarSide.LEFT
  const toggleVisible = (): void => {
    toggleSidebar(layoutName, side)
  }

  return (
    <IconButton onClick={toggleVisible} title={isLeft ? 'Collapse left sidebar' : 'Collapse right sidebar'}>
      <SidebarIcon className={clsx('fill-foreground-muted group-hover:fill-foreground', isLeft && 'rotate-180')} />
    </IconButton>
  )
}
