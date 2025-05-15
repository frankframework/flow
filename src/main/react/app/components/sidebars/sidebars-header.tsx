import SidebarsClose, { type SidebarsCloseProperties } from '~/components/sidebars/sidebars-close'

type SidebarsHeaderProperties = {
  title?: string
} & SidebarsCloseProperties

export default function SidebarsHeader({ title, sidebarId, index }: Readonly<SidebarsHeaderProperties>) {
  return (
    <div className="flex h-12 items-center gap-1 border-b border-b-gray-200 px-4">
      <SidebarsClose sidebarId={sidebarId} index={index} />
      {title && <div className="text-xl">{title}</div>}
    </div>
  )
}
