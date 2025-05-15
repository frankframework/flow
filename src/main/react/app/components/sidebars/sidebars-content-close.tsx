import SidebarsClose, { type SidebarsCloseProperties } from '~/components/sidebars/sidebars-close'
import { useSidebarStore } from '~/components/sidebars/sidebars-store'

export default function SidebarsContentClose(properties: Readonly<SidebarsCloseProperties>) {
  const visible = useSidebarStore((sate) => sate.instances[properties.sidebarId].visible[properties.index])

  if (!visible) {
    return (
      <div className="flex aspect-square items-center justify-center border-r border-b border-gray-200">
        <SidebarsClose {...properties} />
      </div>
    )
  }
}
