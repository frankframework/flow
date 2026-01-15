import { useNavigate } from 'react-router'
import { useProjectStore } from '~/stores/project-store'
import { useTreeStore } from '~/stores/tree-store'
import KebabVerticalIcon from 'icons/solar/Kebab Vertical.svg?react'
import useTabStore from '~/stores/tab-store'
import type { Project } from '~/routes/projectlanding/project-landing'

interface ProjectRowProperties {
  project: Project
}

export default function ProjectRow({ project }: Readonly<ProjectRowProperties>) {
  const navigate = useNavigate()

  const setProject = useProjectStore((state) => state.setProject)
  const clearConfigs = useTreeStore((state) => state.clearConfigs)
  const clearTabs = useTabStore((state) => state.clearTabs)

  return (
    <div
      className="hover:bg-backdrop mb-2 flex w-full cursor-pointer items-center justify-between rounded px-3 py-1"
      onClick={() => {
        setProject(project)
        clearConfigs()
        clearTabs()
        navigate('/configurations')
      }}
    >
      <div className="flex flex-col">
        <div className="">{project.name}</div>
        <p className="text-foreground-muted">
          {project.rootPath}\{project.name}
        </p>
      </div>

      <KebabVerticalIcon className="h-4 w-auto" />
    </div>
  )
}
