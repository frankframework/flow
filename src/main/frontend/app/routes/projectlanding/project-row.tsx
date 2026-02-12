import CloseSquareIcon from 'icons/solar/Close Square.svg?react'
import ArchiveIcon from '/icons/solar/Archive.svg?react'
import type { RecentProject } from '~/types/project.types'

interface ProjectRowProperties {
  project: RecentProject
  isLocal: boolean
  onClick: () => void
  onRemove: () => void
  onExport: () => void
}

export default function ProjectRow({ project, isLocal, onClick, onRemove, onExport }: Readonly<ProjectRowProperties>) {
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
            onClick={(e) => {
              e.stopPropagation()
              onExport()
            }}
            className="text-foreground-muted cursor-pointer rounded p-2 transition-colors hover:text-blue-500"
            aria-label="Export project as zip"
            title="Export as .zip"
          >
            <ArchiveIcon className="h-4 w-4" />
          </button>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="text-foreground-muted cursor-pointer rounded p-2 transition-colors hover:text-red-500"
          aria-label="Remove from recent projects"
        >
          <CloseSquareIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
