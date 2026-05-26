import ArchiveIcon from '/icons/solar/Archive.svg?react'
import TrashBinIcon from '/icons/solar/Trash Bin.svg?react'
import type { RecentConfigurationProject } from '~/types/project.types'
import KebabMenu, { type KebabMenuItem } from '~/components/inputs/kebab-menu'

interface ConfigurationRowProperties {
  project: RecentConfigurationProject
  isLocal: boolean
  onClick: () => void
  onRemove: () => void
  onExport: () => void
}

export default function ConfigurationRow({
  project,
  isLocal,
  onClick,
  onRemove,
  onExport,
}: Readonly<ConfigurationRowProperties>) {
  const menuItems: KebabMenuItem[] = [
    ...(isLocal
      ? []
      : [
          {
            label: 'Export as .zip',
            icon: <ArchiveIcon className="h-4 w-4 fill-current" />,
            onClick: onExport,
          },
        ]),
    {
      label: 'Remove from recent',
      icon: <TrashBinIcon className="h-4 w-4 fill-current" />,
      onClick: onRemove,
      className: 'text-red-500',
    },
  ]

  return (
    <div
      className="hover:bg-backdrop mb-2 flex w-full cursor-pointer items-center justify-between rounded px-3 py-1"
      onClick={onClick}
    >
      <div className="flex flex-col">
        <div>{project.name}</div>
        <p className="text-foreground-muted text-xs">{project.rootPath}</p>
      </div>

      <KebabMenu items={menuItems} />
    </div>
  )
}
