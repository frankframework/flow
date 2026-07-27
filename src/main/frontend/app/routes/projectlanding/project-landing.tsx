import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router'
import FfIcon from '/icons/custom/ff!-icon.svg?react'
import useToasts from '~/components/toast/use-toasts'
import ProjectList from '~/routes/projectlanding/project-list'
import Sidebar from '~/routes/projectlanding/sidebar'
import Toolbar from '~/routes/projectlanding/toolbar'
import { fetchInstanceConfigurations, type FFConfiguration } from '~/services/frank-framework-service'
import { useProjectStore } from '~/stores/project-store'
import type { ConfigurationProject } from '~/types/project.types'
import { ApiError } from '~/utils/api'
import { getParentPath, normalizePath } from '~/utils/path-utils'

import NewConfigurationModal from './new-configuration-modal'
import CloneConfigurationModal from './clone-configuration-modal'
import DirectoryPicker from '~/components/directory-picker/directory-picker'
import { fetchAppInfo } from '~/services/app-info-service'
import { removeRecentProject } from '~/services/recent-project-service'
import useTabStore from '~/stores/tab-store'
import useEditorTabStore from '~/stores/editor-tab-store'
import {
  cloneProject,
  createProject,
  DEFAULT_MAX_IMPORT_BYTES,
  exportProject,
  importProjectFolder,
  ImportTooLargeError,
  openProject,
} from '~/services/project-service'
import { useRecentProjects } from '~/hooks/use-projects'

export default function ProjectLanding(): React.JSX.Element {
  const navigate = useNavigate()
  const { data: recentProjects, isLoading, error: apiError, refetch } = useRecentProjects()
  const clearProjectState = useProjectStore((state): (() => void) => state.clearProject)
  const clearTabsState = useTabStore((state): (() => void) => state.clearTabs)
  const clearEditorTabsState = useEditorTabStore((state): (() => void) => state.clearTabs)
  const setProject = useProjectStore((state): ((project: ConfigurationProject) => void) => state.setProject)
  const { showErrorToast, showWarningToast, logApiError } = useToasts()

  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false)
  const [isDirectoryPickerOpen, setIsDirectoryPickerOpen] = useState(false)
  const [isLocalEnvironment, setIsLocalEnvironment] = useState(true)
  const [rootLocationName, setRootLocationName] = useState('Computer')
  const [isOpeningProject, setIsOpeningProject] = useState(false)
  const [isDiscovering, setIsDiscovering] = useState(false)
  const [ffConfiguration, setFFConfiguration] = useState<FFConfiguration[]>([])
  const [ffInstanceName, setFFInstanceName] = useState('')
  const [maxImportBytes, setMaxImportBytes] = useState(DEFAULT_MAX_IMPORT_BYTES)
  const importInputReference = useRef<HTMLInputElement>(null)

  useEffect((): void => {
    clearProjectState()
    clearEditorTabsState()
    clearTabsState()
  }, [clearEditorTabsState, clearProjectState, clearTabsState])

  useEffect((): void => {
    fetchAppInfo()
      .then((info): void => {
        setIsLocalEnvironment(info.isLocal)
        setRootLocationName(info.isLocal ? 'Computer' : 'Cloud Workspace')
        setMaxImportBytes(info.maxImportSize)
      })
      .catch((_): void => {
        showErrorToast('Failed to fetch environment info, defaulting to local mode.')
      })
  }, [showErrorToast])

  useEffect((): void => {
    if (apiError) {
      showErrorToast(`Could not load in projects: ${apiError.message}`)
    }
  }, [apiError, showErrorToast])

  useEffect((): (() => void) | undefined => {
    if (!isLocalEnvironment) return

    const discover = (): void => {
      setIsDiscovering(true)
      fetchInstanceConfigurations()
        .then((ffInstance): void => {
          setFFInstanceName(ffInstance.name)
          setFFConfiguration(ffInstance.configurations)
        })
        .catch((error): void => {
          if (error instanceof ApiError && error.httpCode === 404) return
          logApiError(error.message, error)
        })
        .finally((): void => setIsDiscovering(false))
    }

    discover()
    const interval = setInterval(discover, 60_000)

    return (): void => {
      clearInterval(interval)
    }
  }, [isLocalEnvironment, logApiError])

  const openProjectAndNavigate = useCallback(
    (project: ConfigurationProject): void => {
      setProject(project)
      navigate(`/configurations`)
    },
    [navigate, setProject],
  )

  const handleOpenProject = useCallback(
    async (rootPath: string): Promise<void> => {
      setIsOpeningProject(true)
      try {
        const project = await openProject(rootPath)
        openProjectAndNavigate(project)
      } catch (error) {
        showErrorToast(error instanceof Error ? error.message : 'Failed to open project')
      } finally {
        setIsOpeningProject(false)
      }
    },
    [openProjectAndNavigate, showErrorToast],
  )

  if (isLoading || isOpeningProject) return <LoadingState />

  const projects = recentProjects ?? []
  const filteredProjects = projects.filter((project): boolean =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )
  const lastRecentRootPath = normalizePath(projects[0]?.rootPath ?? '')

  const onOpenFolder = async (selectedPath: string): Promise<void> => {
    setIsDirectoryPickerOpen(false)
    await handleOpenProject(selectedPath)
  }

  const onCreateProject = async (name: string, rootPath: string): Promise<void> => {
    setIsOpeningProject(true)
    try {
      const project = await createProject(name, rootPath)
      setIsModalOpen(false)
      openProjectAndNavigate(project)
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : 'Failed to create project')
    } finally {
      setIsOpeningProject(false)
    }
  }

  const onCloneProject = async (repoUrl: string, localPath: string, token?: string): Promise<void> => {
    setIsOpeningProject(true)
    try {
      const project = await cloneProject(repoUrl, localPath, token)
      setIsCloneModalOpen(false)
      openProjectAndNavigate(project)
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : 'Failed to clone project from GitHub')
    } finally {
      setIsOpeningProject(false)
    }
  }

  const onRemoveProject = async (rootPath: string): Promise<void> => {
    try {
      await removeRecentProject(rootPath)
      refetch()
    } catch {
      showErrorToast('Failed to remove recent opened project')
    }
  }

  const onExportProject = async (projectName: string): Promise<void> => {
    try {
      await exportProject(projectName)
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : 'Failed to export project')
    }
  }

  const handleImportFolderChange = async (error: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const files = error.target.files
    if (!files || files.length === 0) return

    setIsOpeningProject(true)
    try {
      const project = await importProjectFolder(files, maxImportBytes)
      openProjectAndNavigate(project)
      refetch()
    } catch (error) {
      const limitMb = Math.round(maxImportBytes / (1024 * 1024))
      if (error instanceof ImportTooLargeError) {
        const sizeMb = (error.bytes / (1024 * 1024)).toFixed(1)
        const dimension = error.kind === 'compressed' ? 'when zipped' : 'uncompressed'
        showWarningToast(
          `This configuration is ${sizeMb} MB ${dimension}, which exceeds the ${limitMb} MB limit. Please import a smaller folder.`,
          'Configuration too large',
        )
      } else if (error instanceof ApiError && error.httpCode === 413) {
        showWarningToast(
          `This configuration is too large to import (over ${limitMb} MB). Please import a smaller folder.`,
          'Configuration too large',
        )
      } else {
        showErrorToast(error instanceof Error ? error.message : 'Failed to import project')
      }
    } finally {
      setIsOpeningProject(false)
    }

    if (importInputReference.current) {
      importInputReference.current.value = ''
    }
  }

  return (
    <div className="bg-backdrop flex min-h-screen w-full flex-col items-center justify-center pt-8 pb-48">
      <Header />

      <main className="border-border bg-background flex min-h-100 w-full max-w-5xl flex-col rounded border shadow lg:w-3/4">
        <Toolbar onSearchChange={setSearchTerm} />

        <div className="flex flex-1 overflow-hidden">
          <Sidebar
            isLocal={isLocalEnvironment}
            onNewClick={(): void => setIsModalOpen(true)}
            onOpenClick={(): void => setIsDirectoryPickerOpen(true)}
            onCloneClick={(): void => setIsCloneModalOpen(true)}
            onImportClick={(): void | undefined => importInputReference.current?.click()}
          />
          <ProjectList
            projects={filteredProjects}
            isLocal={isLocalEnvironment}
            onProjectClick={handleOpenProject}
            onRemoveProject={onRemoveProject}
            onExportProject={onExportProject}
            frameworkInstanceName={ffInstanceName}
            frameworkConfigurations={ffConfiguration}
            isDiscovering={isDiscovering}
          />
        </div>
      </main>

      {!isLocalEnvironment && (
        <div className="border-border bg-warning/10 text-warning mt-3 w-full max-w-5xl rounded border px-4 py-2 text-xs lg:w-3/4">
          Cloud workspace projects are automatically removed after 24 hours of inactivity. After you are done please use
          the Export functionality in the landing page to download a backup of your project.
        </div>
      )}

      {isModalOpen && (
        <NewConfigurationModal
          onClose={(): void => setIsModalOpen(false)}
          onCreate={onCreateProject}
          isLocal={isLocalEnvironment}
          initialPath={getParentPath(lastRecentRootPath)}
        />
      )}
      {isCloneModalOpen && (
        <CloneConfigurationModal
          isLocal={isLocalEnvironment}
          onClose={(): void => setIsCloneModalOpen(false)}
          onClone={onCloneProject}
          initialPath={getParentPath(lastRecentRootPath)}
        />
      )}
      {!isLocalEnvironment && (
        <input
          ref={importInputReference}
          type="file"
          /* @ts-expect-error webkitdirectory is a non-standard but widely supported attribute */
          webkitdirectory=""
          multiple
          className="hidden"
          onChange={handleImportFolderChange}
        />
      )}
      {isDirectoryPickerOpen && (
        <DirectoryPicker
          onSelect={onOpenFolder}
          onCancel={(): void => setIsDirectoryPickerOpen(false)}
          rootLabel={rootLocationName}
          initialPath={getParentPath(lastRecentRootPath)}
        />
      )}
    </div>
  )
}

const Header = (): React.JSX.Element => (
  <header className="mb-4 flex w-full max-w-5xl lg:w-3/4">
    <div className="flex w-1/4 min-w-50 items-center gap-3 px-4">
      <FfIcon className="h-10 w-auto" />
      <h1 className="dark:text-foreground text-lg font-semibold text-black">Flow</h1>
    </div>
  </header>
)

const LoadingState = (): React.JSX.Element => (
  <div className="text-foreground-muted flex h-screen w-full items-center justify-center">
    Initializing workspace...
  </div>
)
