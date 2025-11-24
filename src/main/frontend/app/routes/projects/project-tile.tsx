import RulerCrossPenIcon from '/icons/solar/Ruler Cross Pen.svg?react'
import CodeIcon from '/icons/solar/Code.svg?react'
import type { Project } from './projects'
import { useNavigate } from 'react-router'
import { useProjectStore } from '~/stores/project-store'
import { useTreeStore } from '~/stores/tree-store'

interface ProjectTileProperties {
  project: Project
}

export default function ProjectTile({ project }: Readonly<ProjectTileProperties>) {
  const navigate = useNavigate()

  const setProject = useProjectStore((state) => state.setProject)
  const clearConfigs = useTreeStore((state) => state.clearConfigs)

  return (
    <div className="border-border bg-background flex h-40 w-56 flex-col justify-between rounded-2xl border shadow-md">
      {/* Project Name */}
      <div className="flex flex-1 items-center justify-center px-2">
        <h2 className="text-center text-lg font-semibold break-words">{project.name}</h2>
      </div>

      {/* Bottom Action Bar */}
      <div className="flex divide-x divide-border border-t border-border">
        <button
          onClick={() => {
            clearConfigs()
            setProject(project)
            navigate('/studio')
          }}
          className="hover:text-foreground-active flex flex-1 items-center justify-center gap-2 p-2 hover:cursor-pointer"
        >
          <RulerCrossPenIcon className="h-8 w-auto fill-current" />
          <span className="text-sm font-medium">Open in Studio</span>
        </button>

        <button
          onClick={() => {
            clearConfigs()
            setProject(project)
            navigate('/editor')
          }}
          className="hover:text-foreground-active flex flex-1 items-center justify-center gap-2 p-2 hover:cursor-pointer"
        >
          <CodeIcon className="h-8 w-auto fill-current" />
          <span className="text-sm font-medium">Open in Editor</span>
        </button>
      </div>
    </div>
  )
}
