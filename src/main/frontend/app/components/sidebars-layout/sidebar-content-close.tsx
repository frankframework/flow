import SidebarClose, { type SidebarsCloseProperties } from '~/components/sidebars-layout/sidebar-close'
import { useSidebarStore } from '~/stores/sidebar-layout-store'
import { useContext } from 'react'
import { SidebarContext } from '~/components/sidebars-layout/sidebar-layout'

export default function SidebarContentClose(properties: Readonly<SidebarsCloseProperties>) {
  const layoutName = useContext(SidebarContext)
  if (!layoutName) throw new Error('SidebarsClose must be used within a SidebarLayout or be provided a layoutName prop')
  const visible = useSidebarStore((state) => state.getVisibility(layoutName)?.[properties.side]) ?? null

  if (!visible) {
    return (
      <div className="border-border flex aspect-square h-12 items-center justify-center border">
        <SidebarClose {...properties} />
      </div>
    )
  }
  return null
}
