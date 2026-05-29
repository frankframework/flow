import SidebarIcon from '/icons/solar/Sidebar Minimalistic.svg?react'
import { SidebarSide, useSidebarStore } from '~/components/sidebars-layout/sidebar-layout-store'
import clsx from 'clsx'
import { useContext } from 'react'
import { SidebarContext } from '~/components/sidebars-layout/sidebar-layout'
import IconButton from '~/components/inputs/icon-button'

export interface SidebarsCloseProperties {
  side: SidebarSide
}

export default function SidebarClose({ side }: Readonly<SidebarsCloseProperties>) {
  const layoutName = useContext(SidebarContext)
  const visibility = useSidebarStore((state) => state.getVisibility(layoutName ?? ''))
  const setVisible = useSidebarStore((state) => state.setVisible)
  const isLeft = side === SidebarSide.LEFT

  if (!layoutName) throw new Error('SidebarsClose must be used within a SidebarLayout')

  const toggleVisible = () => {
    setVisible(layoutName, side, !visibility[side])
  }

  return (
    <IconButton onClick={toggleVisible} title={isLeft ? 'Collapse left sidebar' : 'Collapse right sidebar'}>
      <SidebarIcon className={clsx('fill-foreground-muted group-hover:fill-foreground', isLeft && 'rotate-180')} />
    </IconButton>
  )
}
