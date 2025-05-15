import SidebarIcon from '/icons/solar/Sidebar Minimalistic.svg?react'
import { useSidebarStore, SidebarIndex } from '~/components/sidebars/sidebars-store'
import clsx from 'clsx'

export interface SidebarsCloseProperties {
  sidebarId: string
  index: SidebarIndex
}

export default function SidebarsClose({ sidebarId, index }: Readonly<SidebarsCloseProperties>) {
  const { toggleSidebar } = useSidebarStore()

  const toggleVisible = () => {
    toggleSidebar(sidebarId, index)
  }

  const isLeft = index === SidebarIndex.LEFT

  return (
    <SidebarIcon
      onClick={toggleVisible}
      className={clsx('fill-gray-950 hover:fill-[var(--color-brand)]', isLeft && 'rotate-180')}
    ></SidebarIcon>
  )
}
