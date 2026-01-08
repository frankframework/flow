import { useEffect, useRef, useState } from 'react'
import FfIcon from '/icons/custom/ff!-icon.svg?react'
import ArchiveIcon from '/icons/solar/Archive.svg?react'
import ProjectRow from './project-row'
import Search from '~/components/search/search'
import ActionButton from './action-button'
import { useProjectStore } from '~/stores/project-store'
import { useLocation } from 'react-router'
import NewProjectModal from './new-project-modal'
import LoadProjectModal from './load-project-modal'

export interface Project {
  name: string
  rootPath?: string
  filepaths: string[]
  filters: Record<string, boolean> // key = filter name (e.g. "HTTP"), value = true/false
}

interface DirectoryFile extends File {
  webkitRelativePath: string
}

export default function ProjectLanding() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showNewProjectModal, setShowNewProjectModal] = useState(false)
  const [showLoadProjectModal, setShowLoadProjectModal] = useState(false)

  const clearProject = useProjectStore((state) => state.clearProject)
  const location = useLocation()
  const fileInputReference = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch('/api/projects')
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`)
        }
        const data = await response.json()
        setProjects(data)
      } catch (error_) {
        setError(error_ instanceof Error ? error_.message : 'Failed to fetch projects')
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [])

  // Reset project when landing on home page
  useEffect(() => {
    clearProject()
  }, [location.key, clearProject])

  const handleOpenProject = () => {
    fileInputReference.current?.click()
  }

  const handleFolderSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    // Detect project root folder (first directory name)
    const firstFile = files[0] as DirectoryFile
    const projectRoot = firstFile.webkitRelativePath.split('/')[0]

    // 1. Create project in backend
    await createProject(projectRoot)

    // 2. Collect XML configuration files from /src/main/configurations
    const configs: { filepath: string; xmlContent: string }[] = []

    for (const file of [...files] as DirectoryFile[]) {
      const relative = file.webkitRelativePath

      if (relative.startsWith(`${projectRoot}/src/main/configurations/`) && relative.endsWith('.xml')) {
        const content = await file.text() // read file content
        configs.push({
          filepath: relative.replace(`${projectRoot}/`, ''), // path relative to project root
          xmlContent: content,
        })
      }
    }

    // Import configurations to the project
    await fetch(`/api/projects/${projectRoot}/import-configurations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectName: projectRoot,
        configurations: configs,
      }),
    })

    // Sync local project list with backend
    const updated = await fetch(`/api/projects/${projectRoot}`).then((res) => res.json())
    setProjects((prev) => prev.map((p) => (p.name === updated.name ? updated : p)))
  }

  const createProject = async (projectName: string, rootPath?: string) => {
    try {
      const response = await fetch(`/api/projects/${projectName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }
      // refresh the project list after creation
      const newProject = await response.json()
      setProjects((previous) => [...previous, newProject])
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'Failed to create project')
    }
  }

  const loadProject = async () => {
    setShowLoadProjectModal(true)
  }

  // Filter projects by search string (case-insensitive)
  const filteredProjects = projects.filter((project) => project.name.toLowerCase().includes(search.toLowerCase()))

  if (loading)
    return (
      <div className="bg-backdrop flex min-h-screen w-full items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading projects...</p>
      </div>
    )
  if (error) return <p>Error: {error}</p>

  return (
    <div className="bg-backdrop flex min-h-screen w-full flex-col items-center pt-20">
      <div className="relative mb-6 flex w-2/5 flex-row items-center">
        <div className="flex w-1/4 flex-row items-center">
          <FfIcon className="h-auto w-12" />
          <div className="px-2 text-lg font-semibold">Flow</div>
        </div>
      </div>
      <div
        className="border-border bg-background flex min-h-[400px] w-2/5 flex-col rounded border shadow"
        style={{ height: 400 }}
      >
        {/* Header row */}
        <div className="border-border flex h-12 border-b">
          <div className="border-border flex w-1/4 items-center border-r px-4 text-sm font-semibold">
            <ArchiveIcon className="mr-2 h-5 w-auto" /> Projects
          </div>
          <div className="flex w-3/4 items-center justify-center px-4 text-sm font-semibold">
            <Search onChange={(event) => setSearch(event.target.value)} />
          </div>
        </div>
        {/* Content row */}
        <div className="flex flex-1 overflow-hidden">
          <div className="border-border text-muted-foreground w-1/4 border-r px-4 py-3 text-sm">
            <ActionButton label="New Project" onClick={() => setShowNewProjectModal(true)} />
            <ActionButton label="Open" onClick={handleOpenProject} />

            <input
              type="file"
              ref={fileInputReference}
              style={{ display: 'none' }}
              onChange={handleFolderSelection}
              webkitdirectory="true"
              multiple
            />
            <ActionButton label="Clone Repository" onClick={() => console.log('Cloning project')} />
            <ActionButton label="Load Project" onClick={loadProject} />
          </div>
          <div className="h-full w-3/4 overflow-y-auto px-4 py-3">
            {filteredProjects.map((project, index) => (
              <ProjectRow key={project.name + index} project={project} />
            ))}
          </div>
        </div>
      </div>
      <NewProjectModal
        isOpen={showNewProjectModal}
        onClose={() => setShowNewProjectModal(false)}
        onCreate={createProject}
      />
      <LoadProjectModal
        isOpen={showLoadProjectModal}
        onClose={() => setShowLoadProjectModal(false)}
        onCreate={createProject}
      />
    </div>
  )
}
