import CloseSquareIcon from 'icons/solar/Close Square.svg?react'
import type { RecentProject } from '~/types/project.types'

interface ProjectRowProperties {
  project: RecentProject
  onClick: () => void
  onRemove: () => void
}

export default function ProjectRow({ project, onClick, onRemove }: Readonly<ProjectRowProperties>) {
  return (
    <div
      className="hover:bg-backdrop mb-2 flex w-full cursor-pointer items-center justify-between rounded px-3 py-1"
      onClick={onClick}
    >
      <div className="flex flex-col">
        <div>{project.name}</div>
        <p className="text-foreground-muted text-xs">{project.rootPath}</p>
      </div>

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
  )
}
