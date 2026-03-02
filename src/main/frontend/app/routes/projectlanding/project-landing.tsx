import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router'
import FfIcon from '/icons/custom/ff!-icon.svg?react'
import ArchiveIcon from '/icons/solar/Archive.svg?react'
import { useProjectStore } from '~/stores/project-store'

import ProjectRow from './project-row'
import Search from '~/components/search/search'
import ActionButton from './action-button'
import NewProjectModal from './new-project-modal'
import CloneProjectModal from './clone-project-modal'
import DirectoryPicker from '~/components/directory-picker/directory-picker'
import type { RecentProject } from '~/types/project.types'
import { fetchAppInfo } from '~/services/app-info-service'
import { removeRecentProject } from '~/services/recent-project-service'
import useTabStore from '~/stores/tab-store'
import useEditorTabStore from '~/stores/editor-tab-store'
import {
  cloneProject,
  createProject,
  exportProject,
  importProjectFolder,
  openProject,
} from '~/services/project-service'
import { useRecentProjects } from '~/hooks/use-projects'
import { showErrorToast } from '~/components/toast'

export default function ProjectLanding() {
  const navigate = useNavigate()
  const { data: recentProjects, isLoading, error: apiError, refetch } = useRecentProjects()
  const clearProjectState = useProjectStore((state) => state.clearProject)
  const clearTabsState = useTabStore((state) => state.clearTabs)
  const clearEditorTabsState = useEditorTabStore((state) => state.clearTabs)
  const setProject = useProjectStore((state) => state.setProject)

  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false)
  const [isOpenPickerOpen, setIsOpenPickerOpen] = useState(false)
  const [isLocalEnvironment, setIsLocalEnvironment] = useState(true)
  const [rootLocationName, setRootLocationName] = useState('Computer')
  const [isOpeningProject, setIsOpeningProject] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    clearProjectState()
    clearEditorTabsState()
    clearTabsState()
  }, [clearEditorTabsState, clearProjectState, clearTabsState])

  useEffect(() => {
    const loadAppInfo = async () => {
      try {
        const info = await fetchAppInfo()
        setIsLocalEnvironment(info.isLocal)

        if (info.workspaceRoot) {
          setRootLocationName(info.workspaceRoot)
        }
      } catch {
        showErrorToast('Failed to fetch app info, defaulting to local mode.')
      }
    }
    loadAppInfo()
  }, [])

  useEffect(() => {
    if (apiError) {
      showErrorToast(`Could not load in projects: ${apiError.message}`)
    }
  }, [apiError])

  const handleOpenProject = useCallback(
    async (rootPath: string) => {
      setIsOpeningProject(true)
      try {
        const project = await openProject(rootPath)
        setProject(project)
        navigate(`/studio/${encodeURIComponent(project.name)}`)
      } catch (error) {
        showErrorToast(error instanceof Error ? error.message : 'Failed to open project')
      } finally {
        setIsOpeningProject(false)
      }
    },
    [navigate, setProject],
  )

  const onOpenFolder = async (selectedPath: string) => {
    setIsOpenPickerOpen(false)
    await handleOpenProject(selectedPath)
  }

  const onCreateProject = async (absolutePath: string) => {
    setIsOpeningProject(true)
    try {
      const project = await createProject(absolutePath)
      setProject(project)
      setIsModalOpen(false)
      navigate(`/studio/${encodeURIComponent(project.name)}`)
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : 'Failed to create project')
    } finally {
      setIsOpeningProject(false)
    }
  }

  const onCloneProject = async (repoUrl: string, localPath: string, token?: string) => {
    setIsOpeningProject(true)
    try {
      const project = await cloneProject(repoUrl, localPath, token)
      setProject(project)
      setIsCloneModalOpen(false)
      navigate(`/studio/${encodeURIComponent(project.name)}`)
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : 'Failed to clone project from GitHub')
    } finally {
      setIsOpeningProject(false)
    }
  }

  const onRemoveProject = async (rootPath: string) => {
    try {
      await removeRecentProject(rootPath)
      refetch()
    } catch {
      showErrorToast('Failed to remove recent opened project')
    }
  }

  // eslint-disable-next-line unicorn/consistent-function-scoping
  const onExportProject = async (projectName: string) => {
    try {
      await exportProject(projectName)
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : 'Failed to export project')
    }
  }

  const handleImportFolderChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsOpeningProject(true)
    try {
      const project = await importProjectFolder(files)
      setProject(project)
      refetch()
      navigate(`/studio/${encodeURIComponent(project.name)}`)
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : 'Failed to import project')
    } finally {
      setIsOpeningProject(false)
    }

    if (importInputRef.current) {
      importInputRef.current.value = ''
    }
  }

  const projects = recentProjects ?? []
  const filteredProjects = projects.filter((project) => project.name.toLowerCase().includes(searchTerm.toLowerCase()))

  if (isLoading || isOpeningProject) return <LoadingState />

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
            Cloud workspace projects are automatically removed after 24 hours of inactivity. After you are done please
            use the Export functionality in the landing page to download a backup of your project.
          </div>
        )}
      </main>

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
    <h1 className="text-lg font-semibold text-slate-800">Flow</h1>
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
  <nav className="border-border flex w-1/4 min-w-[200px] flex-col gap-3 border-r bg-slate-50/50 p-4">
    <ActionButton label={isLocal ? 'Open Local Folder' : 'Open Workspace Project'} onClick={onOpenClick} />
    <ActionButton label="Clone Repository" onClick={onCloneClick} />
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
      projects.map((project) => (
        <ProjectRow
          key={project.rootPath}
          project={project}
          isLocal={isLocal}
          onClick={() => onProjectClick(project.rootPath)}
          onRemove={() => onRemoveProject(project.rootPath)}
          onExport={() => onExportProject(project.name)}
        />
      ))
    )}
  </section>
)

const Toolbar = ({ onSearchChange }: { onSearchChange: (val: string) => void }) => (
  <div className="border-border flex h-12 border-b">
    <div className="border-border flex w-1/4 min-w-[200px] items-center border-r px-4 text-xs font-bold tracking-wider text-slate-500 uppercase">
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
