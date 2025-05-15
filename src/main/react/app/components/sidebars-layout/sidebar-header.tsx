import SidebarClose, { type SidebarsCloseProperties } from '~/components/sidebars-layout/sidebar-close'

type SidebarsHeaderProperties = {
  title?: string
} & SidebarsCloseProperties

export default function SidebarHeader({ title, side }: Readonly<SidebarsHeaderProperties>) {
  return (
    <div className="flex h-12 items-center gap-1 px-4">
      <SidebarClose side={side} />
      {title && <div className="text-xl">{title}</div>}
    </div>
  )
}
