import SidebarClose, { type SidebarsCloseProperties } from '~/components/sidebars-layout/sidebar-close'
import { useSidebarStore } from '~/components/sidebars-layout/sidebar-layout-store'
import { useContext } from 'react'
import { SidebarContext } from '~/components/sidebars-layout/sidebar-layout'

export default function SidebarContentClose(properties: Readonly<SidebarsCloseProperties>) {
  const layoutName = useContext(SidebarContext)
  if (!layoutName) throw new Error('SidebarContentClose must be used within a SidebarLayout')

  const visibility = useSidebarStore((state) => state.getVisibility(layoutName))
  const isVisible = visibility[properties.side]

  if (!isVisible) {
    return (
      <div className="border-border flex aspect-square h-12 items-center justify-center border">
        <SidebarClose {...properties} />
      </div>
    )
  }
  return null
}
