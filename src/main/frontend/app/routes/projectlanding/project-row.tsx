import KebabVerticalIcon from 'icons/solar/Kebab Vertical.svg?react'
import type { RecentProject } from '~/types/project.types'

interface ProjectRowProperties {
  project: RecentProject
  onClick: () => void
}

export default function ProjectRow({ project, onClick }: Readonly<ProjectRowProperties>) {
  return (
    <div
      className="hover:bg-backdrop mb-2 flex w-full cursor-pointer items-center justify-between rounded px-3 py-1"
      onClick={onClick}
    >
      <div className="flex flex-col">
        <div>{project.name}</div>
        <p className="text-foreground-muted text-xs">{project.rootPath}</p>
      </div>

      <KebabVerticalIcon className="h-4 w-auto" />
    </div>
  )
}
