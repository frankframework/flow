import CloseSquareIcon from 'icons/solar/Close Square.svg?react'
import ArchiveIcon from '/icons/solar/Archive.svg?react'
import type { RecentConfigurationProject } from '~/types/project.types'

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
  return (
    <div
      className="hover:bg-backdrop mb-2 flex w-full cursor-pointer items-center justify-between rounded px-3 py-1"
      onClick={onClick}
    >
      <div className="flex flex-col">
        <div>{project.name}</div>
        <p className="text-foreground-muted text-xs">{project.rootPath}</p>
      </div>

      <div className="flex items-center gap-1">
        {!isLocal && (
          <button
            onClick={(event) => {
              event.stopPropagation()
              onExport()
            }}
            className="text-foreground-muted hover:text-foreground cursor-pointer rounded p-2 transition-colors"
            aria-label="Export configuration as zip"
            title="Export as .zip"
          >
            <ArchiveIcon className="h-4 w-4" />
          </button>
        )}

        <button
          onClick={(event) => {
            event.stopPropagation()
            onRemove()
          }}
          className="text-foreground-muted hover:text-foreground cursor-pointer rounded p-2 transition-colors"
          aria-label="Remove from recent configurations"
        >
          <CloseSquareIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
