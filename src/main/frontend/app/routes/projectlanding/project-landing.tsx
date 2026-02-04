import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router'
import FfIcon from '/icons/custom/ff!-icon.svg?react'
import ArchiveIcon from '/icons/solar/Archive.svg?react'

import { useRecentProjects } from '~/hooks/use-projects'
import { useProjectStore } from '~/stores/project-store'
import { filesystemService } from '~/services/filesystem-service'
import { openProject, createProject, cloneProject } from '~/services/project-service'

import ProjectRow from './project-row'
import Search from '~/components/search/search'
import ActionButton from './action-button'
import NewProjectModal from './new-project-modal'
import CloneProjectModal from './clone-project-modal'
import type { RecentProject } from '~/types/project.types'

export default function ProjectLanding() {
  const navigate = useNavigate()
  const { data: recentProjects, isLoading, error: apiError, refetch } = useRecentProjects()
  const clearProjectState = useProjectStore((state) => state.clearProject)
  const setProject = useProjectStore((state) => state.setProject)

  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false)
  const [runtimeError, setRuntimeError] = useState<string | null>(null)

  useEffect(() => {
    clearProjectState()
  }, [clearProjectState])

  const handleOpenProject = useCallback(
    async (rootPath: string) => {
      setRuntimeError(null)
      try {
        const project = await openProject(rootPath)
        setProject(project)
        navigate(`/studio/${encodeURIComponent(project.name)}`)
      } catch (error) {
        setRuntimeError(error instanceof Error ? error.message : 'Failed to open project')
      }
    },
    [navigate, setProject],
  )

  const onOpenNativeFolder = async () => {
    setRuntimeError(null)
    try {
      const selection = await filesystemService.selectNativePath()
      if (!selection?.path) return

      const project = await openProject(selection.path)
      setProject(project)
      refetch()
      navigate(`/studio/${encodeURIComponent(project.name)}`)
    } catch (error) {
      setRuntimeError(error instanceof Error ? error.message : 'Failed to open project')
    }
  }

  const onCreateProject = async (absolutePath: string) => {
    setRuntimeError(null)
    try {
      const project = await createProject(absolutePath)
      setProject(project)
      setIsModalOpen(false)
      refetch()
      navigate(`/studio/${encodeURIComponent(project.name)}`)
    } catch (error) {
      setRuntimeError(error instanceof Error ? error.message : 'Creation failed')
    }
  }

  const onCloneProject = async (repoUrl: string, localPath: string) => {
    setRuntimeError(null)
    try {
      const project = await cloneProject(repoUrl, localPath)
      setProject(project)
      setIsCloneModalOpen(false)
      refetch()
      navigate(`/studio/${encodeURIComponent(project.name)}`)
    } catch (error) {
      setRuntimeError(error instanceof Error ? error.message : 'Clone failed')
    }
  }

  const projects = recentProjects ?? []
  const filteredProjects = projects.filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()))

  if (isLoading) return <LoadingState />

  return (
    <div className="bg-backdrop flex min-h-screen w-full flex-col items-center pt-20">
      <Header />

      <main className="border-border bg-background flex min-h-[400px] w-2/5 flex-col rounded border shadow">
        <Toolbar onSearchChange={setSearchTerm} />

        <div className="flex flex-1 overflow-hidden">
          <Sidebar
            onNewClick={() => setIsModalOpen(true)}
            onOpenClick={onOpenNativeFolder}
            onCloneClick={() => setIsCloneModalOpen(true)}
          />
          <ProjectList projects={filteredProjects} onProjectClick={handleOpenProject} />
        </div>
      </main>

      {(runtimeError || apiError) && (
        <p className="mt-4 text-sm font-medium text-red-500">{runtimeError || apiError?.message}</p>
      )}

      <NewProjectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onCreate={onCreateProject} />
      <CloneProjectModal
        isOpen={isCloneModalOpen}
        onClose={() => setIsCloneModalOpen(false)}
        onClone={onCloneProject}
      />
    </div>
  )
}

const Header = () => (
  <header className="mb-6 flex w-2/5 items-center gap-3">
    <FfIcon className="h-12 w-auto" />
    <h1 className="text-lg font-semibold text-slate-800">Frank!Flow</h1>
  </header>
)

const Sidebar = ({
  onNewClick,
  onOpenClick,
  onCloneClick,
}: {
  onNewClick: () => void
  onOpenClick: () => void
  onCloneClick: () => void
}) => (
  <nav className="border-border flex w-1/4 flex-col gap-3 border-r bg-slate-50/50 p-4">
    <ActionButton label="Open Folder" onClick={onOpenClick} />
    <ActionButton label="Clone Repository" onClick={onCloneClick} />
    <ActionButton label="New Project" onClick={onNewClick} />
  </nav>
)

const ProjectList = ({
  projects,
  onProjectClick,
}: {
  projects: RecentProject[]
  onProjectClick: (rootPath: string) => void
}) => (
  <section className="h-full flex-1 overflow-y-auto p-4">
    {projects.length === 0 ? (
      <p className="text-muted-foreground mt-10 text-center text-sm italic">No projects found</p>
    ) : (
      projects.map((p) => <ProjectRow key={p.rootPath} project={p} onClick={() => onProjectClick(p.rootPath)} />)
    )}
  </section>
)

const Toolbar = ({ onSearchChange }: { onSearchChange: (val: string) => void }) => (
  <div className="border-border flex h-12 border-b">
    <div className="border-border flex w-1/4 items-center border-r px-4 text-xs font-bold tracking-wider text-slate-500 uppercase">
      <ArchiveIcon className="mr-2 h-4 w-4" /> Recent
    </div>
    <div className="flex flex-1 items-center px-4">
      <Search onChange={(e) => onSearchChange(e.target.value)} />
    </div>
  </div>
)

const LoadingState = () => (
  <div className="flex h-screen w-full animate-pulse items-center justify-center text-slate-400">
    Initializing workspace...
  </div>
)
