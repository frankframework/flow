import SidebarClose, { type SidebarsCloseProperties } from '~/components/sidebars-layout/sidebar-close'
import { SidebarSide } from '~/components/sidebars-layout/sidebar-layout-store'
import clsx from 'clsx'

type SidebarsHeaderProperties = {
  title?: string
} & SidebarsCloseProperties

export default function SidebarHeader({ title, side }: Readonly<SidebarsHeaderProperties>) {
  const isLeft = side === SidebarSide.LEFT

  return (
    <div className={clsx('flex h-12 items-center px-4', isLeft ? 'gap-1' : 'justify-between')}>
      {side === SidebarSide.LEFT && <SidebarClose side={side} />}
      {title && <div className="text-xl">{title}</div>}
      {side === SidebarSide.RIGHT && <SidebarClose side={side} />}
    </div>
  )
}
