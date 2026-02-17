import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router'
import FfIcon from '/icons/custom/ff!-icon.svg?react'
import ArchiveIcon from '/icons/solar/Archive.svg?react'
import { toast } from 'react-toastify'
import { useRecentProjects } from '~/hooks/use-projects'
import { useProjectStore } from '~/stores/project-store'
import {
  openProject,
  createProject,
  cloneProject,
  exportProject,
  importProjectFolder,
} from '~/services/project-service'

import ProjectRow from './project-row'
import Search from '~/components/search/search'
import ActionButton from './action-button'
import NewProjectModal from './new-project-modal'
import CloneProjectModal from './clone-project-modal'
import DirectoryPicker from '~/components/directory-picker/directory-picker'
import type { RecentProject } from '~/types/project.types'
import { fetchAppInfo } from '~/services/app-info-service'
import { removeRecentProject } from '~/services/recent-project-service'

export default function ProjectLanding() {
  const navigate = useNavigate()
  const { data: recentProjects, isLoading, error: apiError, refetch } = useRecentProjects()
  const clearProjectState = useProjectStore((state) => state.clearProject)
  const setProject = useProjectStore((state) => state.setProject)

  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false)
  const [isOpenPickerOpen, setIsOpenPickerOpen] = useState(false)
  const [isLocalEnvironment, setIsLocalEnvironment] = useState(true)
  const [rootLocationName, setRootLocationName] = useState('Computer')
  const importInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    clearProjectState()
  }, [clearProjectState])

  useEffect(() => {
    const loadAppInfo = async () => {
      try {
        const info = await fetchAppInfo()
        setIsLocalEnvironment(info.isLocal)

        if (info.workspaceRoot) {
          setRootLocationName(info.workspaceRoot)
        }
      } catch {
        toast.error('Failed to fetch app info, defaulting to local mode.')
      }
    }
    loadAppInfo()
  }, [])

  useEffect(() => {
    if (apiError) {
      toast.error(`Could not load in projects: ${apiError.message}`)
    }
  }, [apiError])

  const handleOpenProject = useCallback(
    async (rootPath: string) => {
      try {
        const project = await openProject(rootPath)
        setProject(project)
        navigate(`/studio/${encodeURIComponent(project.name)}`)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to open project')
      }
    },
    [navigate, setProject],
  )

  const onOpenFolder = async (selectedPath: string) => {
    setIsOpenPickerOpen(false)
    await handleOpenProject(selectedPath)
  }

  const onCreateProject = async (absolutePath: string) => {
    try {
      const project = await createProject(absolutePath)
      setProject(project)
      setIsModalOpen(false)
      navigate(`/studio/${encodeURIComponent(project.name)}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create project')
    }
  }

  const onCloneProject = async (repoUrl: string, localPath: string) => {
    try {
      const project = await cloneProject(repoUrl, localPath)
      setProject(project)
      setIsCloneModalOpen(false)
      navigate(`/studio/${encodeURIComponent(project.name)}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to clone project from GitHub')
    }
  }

  const onRemoveProject = async (rootPath: string) => {
    try {
      await removeRecentProject(rootPath)
      refetch()
    } catch {
      toast.error('Failed to remove recent opened project')
    }
  }

  // eslint-disable-next-line unicorn/consistent-function-scoping
  const onExportProject = async (projectName: string) => {
    try {
      await exportProject(projectName)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to export project')
    }
  }

  const handleImportFolderChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    try {
      const project = await importProjectFolder(files)
      setProject(project)
      refetch()
      navigate(`/studio/${encodeURIComponent(project.name)}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to import project')
    }

    if (importInputRef.current) {
      importInputRef.current.value = ''
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
            isLocal={isLocalEnvironment}
            onNewClick={() => setIsModalOpen(true)}
            onOpenClick={() => setIsOpenPickerOpen(true)}
            onCloneClick={() => setIsCloneModalOpen(true)}
            onImportClick={() => importInputRef.current?.click()}
          />
          <ProjectList
            projects={filteredProjects}
            isLocal={isLocalEnvironment}
            onProjectClick={handleOpenProject}
            onRemoveProject={onRemoveProject}
            onExportProject={onExportProject}
          />
        </div>

        {!isLocalEnvironment && (
          <div className="border-border border-t bg-amber-50 px-4 py-2 text-xs text-amber-600">
            Cloud workspace projects are automatically removed after 24 hours of inactivity. Use Export to download a
            backup.
          </div>
        )}
      </main>

      {!isLocalEnvironment && (
        <input
          ref={importInputRef}
          type="file"
          /* @ts-expect-error webkitdirectory is a non-standard but widely supported attribute */
          webkitdirectory=""
          multiple
          className="hidden"
          onChange={handleImportFolderChange}
        />
      )}

      <NewProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={onCreateProject}
        isLocal={isLocalEnvironment}
      />
      <CloneProjectModal
        isOpen={isCloneModalOpen}
        isLocal={isLocalEnvironment}
        onClose={() => setIsCloneModalOpen(false)}
        onClone={onCloneProject}
      />
      <DirectoryPicker
        isOpen={isOpenPickerOpen}
        onSelect={onOpenFolder}
        onCancel={() => setIsOpenPickerOpen(false)}
        rootLabel={rootLocationName}
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
  isLocal,
  onNewClick,
  onOpenClick,
  onCloneClick,
  onImportClick,
}: {
  isLocal?: boolean
  onNewClick: () => void
  onOpenClick: () => void
  onCloneClick: () => void
  onImportClick: () => void
}) => (
  <nav className="border-border flex w-1/4 flex-col gap-3 border-r bg-slate-50/50 p-4">
    <ActionButton label={isLocal ? 'Open Local Folder' : 'Open Workspace Project'} onClick={onOpenClick} />
    {isLocal && <ActionButton label="Clone Repository" onClick={onCloneClick} />}
    <ActionButton label="New Project" onClick={onNewClick} />
    {!isLocal && <ActionButton label="Import Project Folder" onClick={onImportClick} />}
  </nav>
)

const ProjectList = ({
  projects,
  isLocal,
  onProjectClick,
  onRemoveProject,
  onExportProject,
}: {
  projects: RecentProject[]
  isLocal: boolean
  onProjectClick: (rootPath: string) => void
  onRemoveProject: (rootPath: string) => void
  onExportProject: (projectName: string) => void
}) => (
  <section className="h-full flex-1 overflow-y-auto p-4">
    {projects.length === 0 ? (
      <p className="text-muted-foreground mt-10 text-center text-sm italic">No projects found</p>
    ) : (
      projects.map((p) => (
        <ProjectRow
          key={p.rootPath}
          project={p}
          isLocal={isLocal}
          onClick={() => onProjectClick(p.rootPath)}
          onRemove={() => onRemoveProject(p.rootPath)}
          onExport={() => onExportProject(p.name)}
        />
      ))
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
