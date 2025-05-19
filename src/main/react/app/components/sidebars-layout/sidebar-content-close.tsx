import SidebarClose, { type SidebarsCloseProperties } from '~/components/sidebars-layout/sidebar-close'
import { useSidebarStore } from '~/components/sidebars-layout/sidebar-layout-store'
import { useContext } from 'react'
import { SidebarContext } from '~/components/sidebars-layout/sidebar-layout'

export default function SidebarContentClose(properties: Readonly<SidebarsCloseProperties>) {
  const layoutName = useContext(SidebarContext)
  if (!layoutName) throw new Error('SidebarsClose must be used within a SidebarLayout or be provided a layoutName prop')
  const visible = useSidebarStore((sate) => sate.instances[layoutName]?.visible[properties.side]) ?? null

  if (!visible) {
    return (
      <div className="flex aspect-square h-12 items-center justify-center border border-gray-200">
        <SidebarClose {...properties} />
      </div>
    )
  }
  return null
}
